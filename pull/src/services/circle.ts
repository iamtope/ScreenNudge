import { supabase } from '@/src/lib/supabase';

export type CircleProfile = {
  id: string;
  displayName: string;
  inviteCode: string;
  initial: string;
  tone: string;
};

export type CircleData = {
  circleId: string;
  members: CircleProfile[];
  inviteCode: string;
};

const MEMBER_TONES = ['#c9b890', '#7a8a9a', '#9a7a8a', '#8a9a7a', '#9a8a7a'];

type ProfileRow = {
  id: string;
  display_name: string | null;
  invite_code: string;
};

type MemberRow = {
  circle_id: string;
  user_id: string;
  profiles: ProfileRow | ProfileRow[] | null;
};

export function toneForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i)) % MEMBER_TONES.length;
  }
  return MEMBER_TONES[hash];
}

function toCircleProfile(row: ProfileRow): CircleProfile {
  const displayName = row.display_name?.trim() || 'Pull user';
  return {
    id: row.id,
    displayName,
    inviteCode: row.invite_code,
    initial: displayName.charAt(0).toUpperCase(),
    tone: toneForId(row.id),
  };
}

function profileFromMember(row: MemberRow): CircleProfile | null {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  if (!profile) {
    return null;
  }
  return toCircleProfile(profile);
}

export function getInviteLink(inviteCode: string): string {
  return `pull://invite/${inviteCode}`;
}

export function getInviteMessage(inviteCode: string): string {
  return `Join my circle on Pull — use my code ${inviteCode} or open: ${getInviteLink(inviteCode)}`;
}

type EnsureProfileRow = {
  id: string;
  display_name: string | null;
  invite_code: string;
};

/** Creates profile + solo circle when missing (pre-migration accounts). */
export async function ensureMyProfile(): Promise<CircleProfile | null> {
  const { data, error } = await supabase.rpc('ensure_my_profile');
  if (error || !data) {
    return null;
  }
  const row = data as EnsureProfileRow;
  if (!row.invite_code) {
    return null;
  }
  return toCircleProfile({
    id: row.id,
    display_name: row.display_name,
    invite_code: row.invite_code,
  });
}

export async function getMyProfile(userId: string): Promise<CircleProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, invite_code')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toCircleProfile(data);
}

/** Profile with invite code, creating bootstrap rows when needed. */
export async function getOrCreateMyProfile(userId: string): Promise<CircleProfile | null> {
  const existing = await getMyProfile(userId);
  if (existing?.inviteCode) {
    return existing;
  }
  const ensured = await ensureMyProfile();
  if (ensured?.inviteCode) {
    return ensured;
  }
  return getMyProfile(userId);
}

export async function getMyCircle(userId: string): Promise<CircleData | null> {
  const { data: memberships, error: membershipError } = await supabase
    .from('circle_members')
    .select('circle_id')
    .eq('user_id', userId);

  if (membershipError || !memberships?.length) {
    return null;
  }

  const circleIds = memberships.map((row) => row.circle_id);

  const { data: members, error: membersError } = await supabase
    .from('circle_members')
    .select('circle_id, user_id, profiles (id, display_name, invite_code)')
    .in('circle_id', circleIds);

  if (membersError || !members?.length) {
    return null;
  }

  const grouped = new Map<string, CircleProfile[]>();
  for (const row of members as MemberRow[]) {
    const profile = profileFromMember(row);
    if (!profile) {
      continue;
    }
    const list = grouped.get(row.circle_id) ?? [];
    list.push(profile);
    grouped.set(row.circle_id, list);
  }

  const activeCircle = [...grouped.entries()]
    .filter(([, circleMembers]) => circleMembers.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)[0];

  if (!activeCircle) {
    const soloCircle = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    if (!soloCircle) {
      return null;
    }

    const myProfile = soloCircle[1].find((member) => member.id === userId) ?? soloCircle[1][0];
    return {
      circleId: soloCircle[0],
      members: soloCircle[1],
      inviteCode: myProfile.inviteCode,
    };
  }

  const [circleId, circleMembers] = activeCircle;
  const myProfile = circleMembers.find((member) => member.id === userId) ?? circleMembers[0];

  return {
    circleId,
    members: circleMembers,
    inviteCode: myProfile.inviteCode,
  };
}

export async function joinWithCode(code: string): Promise<CircleData> {
  const { error } = await supabase.rpc('join_circle_by_code', {
    code: code.trim(),
  });

  if (error) {
    if (error.message.includes('Invalid invite code')) {
      throw new Error('Invalid invite code');
    }
    if (error.message.includes('Cannot join your own')) {
      throw new Error('Cannot join your own invite code');
    }
    throw error;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error('Not authenticated');
  }

  const circle = await getMyCircle(userData.user.id);
  if (!circle) {
    throw new Error('Joined circle but membership could not be loaded.');
  }

  return circle;
}

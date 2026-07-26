import { Fragment } from 'react';

/** Renders text with *asterisk-wrapped* spans as italic brass accents. */
export function Rich({ text }: { text: string }) {
  const parts = text.split('*');
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <em key={i} className="accent">
            {part}
          </em>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

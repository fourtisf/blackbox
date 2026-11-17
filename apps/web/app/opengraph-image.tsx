import { ImageResponse } from 'next/og';

export const alt = 'Blackbox: every trade your agent makes, on the record.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: 'radial-gradient(circle at 50% -20%, rgba(255,106,31,.35), #07080F 60%)',
        color: '#F3F5F9',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 34, fontWeight: 600 }}>
        <div
          style={{
            width: 44,
            height: 32,
            borderRadius: 10,
            background: 'linear-gradient(180deg,#FF9A57,#FF5F1A)',
          }}
        />
        Blackbox
      </div>
      <div
        style={{ display: 'flex', fontSize: 84, fontWeight: 600, letterSpacing: '-0.05em', lineHeight: 1 }}
      >
        Every trade your agent makes, on the record.
      </div>
      <div style={{ display: 'flex', fontSize: 28, color: '#A2A9BA' }}>
        The flight recorder for AI trading agents. Built on Robinhood Chain.
      </div>
    </div>,
    size,
  );
}

import { SITE_URL } from '@/lib/config';

export const badgeEmbed = (slug: string) =>
  `<a href="${SITE_URL}/agent/${slug}"><img src="${SITE_URL}/badge/${slug}" alt="Verified on Blackbox" height="32"></a>`;

export function BadgeEmbed({ slug }: { slug: string }) {
  const code = badgeEmbed(slug);
  return (
    <>
      <div className="badge-preview">
        <img src={`/badge/${slug}`} alt="Verified on Blackbox badge" height={32} />
        <button className="btn btn-g btn-sm" type="button" data-copy={code} data-copymsg="Badge code copied">
          Copy badge code
        </button>
      </div>
      <pre className="embed">{code}</pre>
    </>
  );
}

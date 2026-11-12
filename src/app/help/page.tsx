import { getT } from "@/lib/i18n/server";
import { SiteHeader } from "@/components/site-header";

export default async function HelpPage() {
  const { t, locale } = await getT();
  const pt = locale === "pt-BR";
  const rows: [string, string][] = pt
    ? [
        ["!sr <música> | recado", "Pede uma música (busca aproximada por título/artista, ignora acentos)."],
        ["!ws", "Remove seu último pedido."],
        ["!replace <música>", "Troca seu último pedido por outra música."],
        ["!song · !next · !last", "Música atual, próxima e última tocada."],
        ["!today", "Quantas músicas tocaram nesta live."],
        ["!has <música> · !lastPlayed <música>", "Verifica se está no repertório / quando tocou pela última vez."],
        ["!fav · !unfav", "Favorita a música atual (ou a informada)."],
        ["!sl · !sq · !commands", "Links do repertório, da fila e dos comandos."],
      ]
    : [
        ["!sr <song> | note", "Request a song (fuzzy title/artist search, accents ignored)."],
        ["!ws", "Remove your last request."],
        ["!replace <song>", "Replace your last request."],
        ["!song · !next · !last", "Current, next and last played song."],
        ["!today", "How many songs were played this stream."],
        ["!has <song> · !lastPlayed <song>", "Is it in the songlist / when was it last played."],
        ["!fav · !unfav", "Favorite the current (or given) song."],
        ["!sl · !sq · !commands", "Links to the songlist, queue and commands."],
      ];
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <h1 className="text-2xl font-bold">{t("help.title")}</h1>
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([c, d]) => (
              <tr key={c} className="border-b border-border">
                <td className="py-2 pr-4 font-mono text-accent">{c}</td>
                <td className="py-2 text-muted">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm text-muted">
          {pt
            ? "Streamers: entrem com a Twitch, criem o repertório no Painel, autorizem o bot e abram a fila. Moderadores cadastrados no Painel podem controlar a fila pelo site."
            : "Streamers: log in with Twitch, create your songlist in the Dashboard, authorize the bot and open the queue. Moderators added in the Dashboard can control the queue on the site."}
        </p>
      </main>
    </>
  );
}

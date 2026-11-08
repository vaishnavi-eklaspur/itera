import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { timeAgo } from "@/lib/utils";
import Link from "next/link";
import { ConsentControls } from "@/components/enquiries/consent-controls";

export const instant = false;

function RichText({ content }: { content: string }) {
  return (
    <>
      {content.split("\n").map((line, lineIndex, lines) => (
        <span key={lineIndex}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) =>
            part.startsWith("**") && part.endsWith("**")
              ? <strong key={partIndex}>{part.slice(2, -2)}</strong>
              : <span key={partIndex}>{part}</span>
          )}
          {lineIndex < lines.length - 1 ? <br /> : null}
        </span>
      ))}
    </>
  );
}

export default async function MyEnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const { id } = await params;
  const enquiry = await db.enquiry.findFirst({
    where: { id, email: session.user.email },
    include: {
      package: { include: { currentVersion: { select: { title: true } } } },
      replies: { orderBy: { sentAt: "asc" }, select: { id: true, content: true, sentAt: true, channel: true } },
    },
  });
  if (!enquiry) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
        <Link href="/my-enquiries" className="text-sm text-forest-700 hover:text-forest-800">
          ← Back to My Enquiries
        </Link>
        <div className="mt-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-semibold text-stone-900">
              {enquiry.package?.currentVersion?.title ?? "Travel enquiry"}
            </h1>
            <p className="text-sm text-stone-400 mt-1">Submitted {timeAgo(enquiry.createdAt)}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            enquiry.status === "NEW" ? "bg-amber-100 text-amber-700" :
            enquiry.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
            enquiry.status === "REPLIED" ? "bg-green-100 text-green-700" :
            "bg-stone-100 text-stone-500"
          }`}>{enquiry.status}</span>
        </div>

        <section className="mt-6 bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="text-sm font-semibold text-stone-900 mb-3">Your enquiry</h2>
          <p className="text-sm text-stone-600 whitespace-pre-wrap">{enquiry.message}</p>
        </section>

        <section className="mt-4 bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="text-sm font-semibold text-stone-900 mb-2">Communication preferences</h2>
          <ConsentControls
            enquiryId={enquiry.id}
            whatsappConsentAt={enquiry.whatsappConsentAt?.toISOString() ?? null}
            whatsappConsentWithdrawnAt={enquiry.whatsappConsentWithdrawnAt?.toISOString() ?? null}
          />
        </section>

        <section className="mt-4 space-y-4">
          <h2 className="text-sm font-semibold text-stone-900">Responses from Itera</h2>
          {enquiry.replies.length === 0 ? (
            <div className="bg-stone-50 rounded-xl p-5 text-sm text-stone-500">
              Our travel team has not replied yet. We will update this page when a response is available.
            </div>
          ) : enquiry.replies.map((reply) => (
            <article key={reply.id} className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-green-700">Reply from Itera Travel</span>
                <span className="text-xs text-green-600">{timeAgo(reply.sentAt)}</span>
              </div>
              <p className="text-sm text-green-800 leading-6">
                <RichText content={reply.content} />
              </p>
            </article>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}

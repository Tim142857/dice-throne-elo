import { redirect } from "next/navigation";

type PublicMatchPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PublicMatchDetailPage({ params }: PublicMatchPageProps) {
  const { id } = await params;
  redirect(`/matchs#match-${id}`);
}

import RequestClient from "./request-client";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <RequestClient code={code} />;
}

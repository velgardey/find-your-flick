import InvitePageClient from '@/components/InvitePageClient';

export type ParamsType = Promise<{ inviteId: string }>;
export type SearchParamsType = Promise<{ [key: string]: string | string[] | undefined }>;

type Props = {
  params: ParamsType;
  searchParams: SearchParamsType;
}

export default async function Page({ params }: Props) {
  const { inviteId } = await params;
  return <InvitePageClient inviteId={inviteId} />;
} 
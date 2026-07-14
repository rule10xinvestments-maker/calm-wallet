import { PublicAccountDeletionPage } from "@/components/account/public-account-deletion-page";
import {
  deleteSignedInAccountAction,
  requestPublicAccountDeletionAction,
} from "@/lib/actions/account-deletion";
import { getAuthSession } from "@/lib/auth/session";
import { isAccountDeletionSchemaAvailable } from "@/domain/account-deletion/service";

export const dynamic = "force-dynamic";

type DeleteAccountPageProps = {
  searchParams?: Promise<{
    verified?: string;
  }>;
};

export default async function DeleteAccountPage({ searchParams }: DeleteAccountPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const [auth, deletionAvailable] = await Promise.all([
    getAuthSession(),
    isAccountDeletionSchemaAvailable(),
  ]);
  const verified = resolvedSearchParams.verified === "1" && Boolean(auth.user);

  return (
    <PublicAccountDeletionPage
      deleteAction={deleteSignedInAccountAction}
      deletionAvailable={deletionAvailable}
      requestAction={requestPublicAccountDeletionAction}
      verified={verified}
    />
  );
}

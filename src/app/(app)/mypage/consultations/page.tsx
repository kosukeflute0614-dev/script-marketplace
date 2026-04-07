import { requireUserOrRedirect } from "@/lib/auth-server";
import { getMyConsultations } from "@/app/actions/consultation";
import { ConsultationList } from "@/components/user/consultation-list";

export const metadata = {
  title: "相談管理 | 脚本マーケット",
};

export default async function ConsultationsPage() {
  const me = await requireUserOrRedirect();
  const result = await getMyConsultations();
  const consultations = result.success ? (result.data ?? []) : [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-heading mb-6 text-2xl font-bold">相談管理</h1>
      <ConsultationList myUid={me.uid} consultations={consultations} />
    </div>
  );
}

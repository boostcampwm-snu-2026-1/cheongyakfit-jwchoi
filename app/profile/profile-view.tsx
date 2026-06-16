import {
  UserRound,
  Users,
  HeartHandshake,
  Wallet,
  Landmark,
  History,
} from "lucide-react";
import type { Profile } from "@/lib/schemas/profile";

const DASH = "—";
const fmtDate = (iso: string | null | undefined) =>
  iso ? iso.replaceAll("-", ".") : DASH;
const fmtWon = (won: number | null | undefined) =>
  won == null ? DASH : `${won.toLocaleString("ko-KR")}원`;
const yesNo = (v: boolean | null | undefined) => (v ? "예" : "아니오");

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <h2 className="mb-4 flex items-center gap-2.5 text-base font-bold tracking-tight text-ink">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon className="h-4.5 w-4.5" />
        </span>
        {title}
      </h2>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-line/70 py-2.5 first:border-t-0 first:pt-0">
      <span className="shrink-0 text-sm font-medium text-muted">{label}</span>
      <span className="text-right text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}

function SubCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-canvas/40 p-4">
      <p className="mb-1.5 text-sm font-bold text-ink-soft">{title}</p>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-line-strong bg-canvas/40 px-4 py-5 text-center text-sm text-muted">
      {children}
    </p>
  );
}

export default function ProfileView({ profile }: { profile: Profile }) {
  const isMarried = profile.maritalStatus === "기혼";
  const { household, children, pastWin } = profile;

  return (
    <div className="flex flex-col gap-4">
      <Section icon={UserRound} title="기본 · 세대">
        <Row label="생년월일" value={fmtDate(profile.birthDate)} />
        <Row label="세대주" value={yesNo(profile.isHouseholdHead)} />
        <Row label="거주 시·도" value={profile.residenceSido} />
        <Row label="현 거주지 전입일" value={fmtDate(profile.residenceSince)} />
      </Section>

      <Section icon={Users} title="세대원">
        {household.length === 0 ? (
          <Empty>등록된 세대원이 없습니다.</Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {household.map((m, i) => (
              <SubCard key={i} title={`세대원 ${i + 1} · ${m.relation}`}>
                <Row label="생년월일" value={fmtDate(m.birthDate)} />
                <Row label="기혼" value={yesNo(m.isMarried)} />
                <Row label="주택 소유" value={yesNo(m.ownsHouse)} />
                <Row label="동일세대 전입일" value={fmtDate(m.coResidentSince)} />
              </SubCard>
            ))}
          </div>
        )}
      </Section>

      <Section icon={HeartHandshake} title="혼인 · 자녀">
        <Row label="혼인 상태" value={profile.maritalStatus} />
        {isMarried && (
          <>
            <Row label="혼인신고일" value={fmtDate(profile.marriageDate)} />
            <Row label="맞벌이" value={yesNo(profile.isDualIncome)} />
            <div className="mt-3">
              {children.length === 0 ? (
                <Empty>등록된 자녀가 없습니다.</Empty>
              ) : (
                <div className="flex flex-col gap-3">
                  {children.map((c, i) => (
                    <SubCard key={i} title={`자녀 ${i + 1} · ${c.status}`}>
                      <Row
                        label="생년월일"
                        value={
                          c.status === "임신" ? "임신 중" : fmtDate(c.birthDate)
                        }
                      />
                    </SubCard>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </Section>

      <Section icon={Wallet} title="소득 · 자산">
        <Row label="세대 구성원 수" value={`${profile.householdSize}명`} />
        <Row label="본인 월소득" value={fmtWon(profile.applicantIncome)} />
        {isMarried && (
          <Row label="배우자 월소득" value={fmtWon(profile.spouseIncome)} />
        )}
        <Row label="부동산 자산" value={fmtWon(profile.realEstateAsset)} />
        <Row
          label="소득세 납부 연수"
          value={
            profile.incomeTaxPaidYears == null
              ? DASH
              : `${profile.incomeTaxPaidYears}년`
          }
        />
      </Section>

      <Section icon={Landmark} title="청약통장">
        <Row label="보유 여부" value={yesNo(profile.hasAccount)} />
        {profile.hasAccount && (
          <>
            <Row label="가입일" value={fmtDate(profile.accountOpenDate)} />
            <Row label="예치금액" value={fmtWon(profile.depositAmount)} />
          </>
        )}
      </Section>

      <Section icon={History} title="주택 · 이력">
        <Row label="과거 주택 소유" value={yesNo(profile.everOwnedHome)} />
        {profile.everOwnedHome && (
          <Row
            label="무주택 시작일"
            value={profile.homelessSince ? fmtDate(profile.homelessSince) : "아직 보유 중"}
          />
        )}
        <Row label="과거 청약 당첨" value={pastWin ? "있음" : "없음"} />
        {pastWin && (
          <SubCard title="당첨 이력">
            <Row label="당첨일" value={fmtDate(pastWin.date)} />
            <Row label="규제지역 당첨" value={yesNo(pastWin.regulated)} />
          </SubCard>
        )}
        <Row label="특별공급 사용" value={yesNo(profile.usedSpecialSupply)} />
      </Section>
    </div>
  );
}

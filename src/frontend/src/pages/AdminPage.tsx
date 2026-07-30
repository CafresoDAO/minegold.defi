import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Principal } from "@icp-sdk/core/principal";
import {
  AlertCircle,
  ArrowLeftRight,
  Bitcoin,
  CheckCircle2,
  Coins,
  Copy,
  Flame,
  Loader2,
  RefreshCw,
  Send,
  Shield,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { useInternetIdentity } from "../auth";
import { useBackendActor } from "../hooks/useBackendActor";
import {
  directAdminGrantAdmin,
  directAdminTransfer,
  directWhoAmI,
  useAdminDissolveCkUNI,
  useAdminInitializeMinterAddress,
  useAdminMintCkUNI,
  useAllUNIDeposits,
  useGetTreasuryWalletInfo,
  useIsAdmin,
  useSetUNIExchangeRate,
  useStrandedQueue,
  useTreasuryICRC1Balances,
  useUNIExchangeRate,
} from "../hooks/useQueries";

const ADMIN_PRINCIPAL = "rc62u-qypnw-bbkkp-d56wk-tnzaq-vwhi2-cqqay-q56hw-gsqbp-6wegl-jae";

// ── UI primitives ────────────────────────────────────────────────────────────

type ActionStatus = { busy: boolean; message: string; ok?: boolean } | null;

function StatusLine({ status }: { status: ActionStatus }) {
  if (!status) return null;
  const color = status.busy
    ? "bg-zinc-800 border-zinc-700 text-zinc-300"
    : status.ok
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
      : "bg-red-500/10 border-red-500/30 text-red-300";
  return (
    <div className={`mt-3 text-xs rounded-lg px-3 py-2 border font-mono break-all ${color}`}>
      {status.busy && <Loader2 className="w-3 h-3 mr-1.5 animate-spin inline" />}
      {status.message}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <h3 className="text-base font-bold text-white mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ── Top-level ────────────────────────────────────────────────────────────────

export function AdminPage() {
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const { data: isAdminData, isLoading: isAdminLoading } = useIsAdmin();

  const callerPrincipal =
    identity && !identity.getPrincipal().isAnonymous()
      ? identity.getPrincipal().toText()
      : null;

  const isLocalAdmin = callerPrincipal === ADMIN_PRINCIPAL;
  const hasAdminAccess = isLocalAdmin || !!isAdminData;

  if (!identity || !callerPrincipal) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <Shield className="w-16 h-16 text-zinc-600 mx-auto mb-4 opacity-40" />
          <h2 className="text-2xl font-bold text-white mb-3">Admin Access</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Connect your Internet Identity to continue.
          </p>
          <Button onClick={login} disabled={isLoggingIn} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
            {isLoggingIn ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wallet className="w-4 h-4 mr-2" />}
            Connect Identity
          </Button>
        </div>
      </div>
    );
  }

  if (!hasAdminAccess && isAdminLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-yellow-500 mx-auto mb-3 animate-spin opacity-60" />
          <p className="text-zinc-400 text-sm">Verifying admin access…</p>
        </div>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4 opacity-60" />
          <h2 className="text-2xl font-bold text-white mb-3">Access Denied</h2>
          <p className="text-zinc-400 text-sm mb-2">Not an admin principal.</p>
          <p className="text-xs text-zinc-500 font-mono mb-6 break-all bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            {callerPrincipal}
          </p>
        </div>
      </div>
    );
  }

  return <AdminContent callerPrincipal={callerPrincipal} />;
}

// ── Main content ─────────────────────────────────────────────────────────────

function AdminContent({ callerPrincipal }: { callerPrincipal: string }) {
  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-yellow-500" />
            <span className="t-label text-yellow-500">Admin panel</span>
          </div>
          <h1 className="text-3xl font-black text-white">Treasury Management</h1>
          <p className="text-zinc-500 text-xs mt-1 font-mono break-all">
            Signed in as: {callerPrincipal}
          </p>
        </div>

        <DiagnosticsBar />

        <Tabs defaultValue="treasury" className="mt-6">
          <TabsList className="bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-6 flex flex-wrap gap-1 h-auto">
            <TabsTrigger value="treasury" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-zinc-400 font-semibold rounded-lg px-4 py-2">
              <Coins className="w-3.5 h-3.5 mr-1.5" />
              Treasury
            </TabsTrigger>
            <TabsTrigger value="deposits" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-zinc-400 font-semibold rounded-lg px-4 py-2">
              <Bitcoin className="w-3.5 h-3.5 mr-1.5" />
              Deposits
            </TabsTrigger>
            <TabsTrigger value="minter" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-zinc-400 font-semibold rounded-lg px-4 py-2">
              <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" />
              Mint &amp; Dissolve
            </TabsTrigger>
            <TabsTrigger value="stranded" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-zinc-400 font-semibold rounded-lg px-4 py-2">
              <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
              Stranded
            </TabsTrigger>
          </TabsList>

          <TabsContent value="treasury">
            <TreasuryTab />
          </TabsContent>
          <TabsContent value="deposits">
            <DepositsTab />
          </TabsContent>
          <TabsContent value="minter">
            <MinterTab />
          </TabsContent>
          <TabsContent value="stranded">
            <StrandedTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── Diagnostics bar ──────────────────────────────────────────────────────────

function DiagnosticsBar() {
  const { identity } = useInternetIdentity();
  const { data: balances, refetch: refetchBalances } = useTreasuryICRC1Balances();
  const [diagStatus, setDiagStatus] = useState<ActionStatus>(null);
  const [who, setWho] = useState<null | Awaited<ReturnType<typeof directWhoAmI>>>(null);

  const runDiagnose = async () => {
    if (!identity) {
      setDiagStatus({ busy: false, ok: false, message: "Not logged in" });
      return;
    }
    setDiagStatus({ busy: true, message: "Querying backend whoAmI…" });
    try {
      const result = await directWhoAmI(identity);
      setWho(result);
      const bal = await refetchBalances();
      const msg =
        `caller=${result.caller} · isAdmin=${result.isAdmin} ` +
        `(hardcoded=${result.isHardcodedAdmin}, role=${result.hasAdminRole}) · ` +
        `sGLDT=${bal.data?.sgldtBalance} · ckUNI=${bal.data?.ckUNIBalance}`;
      setDiagStatus({ busy: false, ok: !!result.isAdmin, message: msg });
    } catch (err) {
      console.error("[whoAmI] threw:", err);
      setDiagStatus({
        busy: false,
        ok: false,
        message: err instanceof Error ? err.message : "Diagnose failed",
      });
    }
  };

  const grantSelfAdmin = async () => {
    if (!identity || !who) return;
    setDiagStatus({ busy: true, message: `Attempting to grant admin to ${who.caller.slice(0, 12)}…` });
    try {
      const result = await directAdminGrantAdmin(identity, who.caller);
      if (result.startsWith("error:")) {
        setDiagStatus({ busy: false, ok: false, message: result.replace(/^error:\s*/, "") });
        return;
      }
      setDiagStatus({ busy: false, ok: true, message: `${result} — click Diagnose again to verify` });
      setWho(null);
    } catch (err) {
      setDiagStatus({
        busy: false,
        ok: false,
        message: err instanceof Error ? err.message : "Grant failed",
      });
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1">
        <div className="t-label text-zinc-500 mb-1">Treasury balances (cached)</div>
        <div className="text-sm text-white font-mono">
          sGLDT <span className="text-yellow-400">{balances ? (Number(balances.sgldtBalance) / 1e8).toFixed(4) : "…"}</span>
          <span className="text-zinc-600 mx-2">·</span>
          ckUNI <span className="text-blue-400">{balances ? (Number(balances.ckUNIBalance) / 1e18).toFixed(6) : "…"}</span>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={runDiagnose} disabled={diagStatus?.busy} className="shrink-0">
        {diagStatus?.busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
        Diagnose
      </Button>
      {who && !who.isAdmin && (
        <Button size="sm" onClick={grantSelfAdmin} disabled={diagStatus?.busy} className="shrink-0 bg-red-500 hover:bg-red-400 text-white font-bold">
          Grant me admin
        </Button>
      )}
      {diagStatus && (
        <div className="w-full">
          <StatusLine status={diagStatus} />
        </div>
      )}
    </div>
  );
}

// ── Treasury tab: transfers + exchange rate ──────────────────────────────────

function TreasuryTab() {
  const { identity } = useInternetIdentity();
  const { data: balances, refetch: refetchBalances } = useTreasuryICRC1Balances();
  const { refetch: refetchWalletInfo } = useGetTreasuryWalletInfo();
  const { data: exchangeRate } = useUNIExchangeRate();
  const setRateMutation = useSetUNIExchangeRate();

  // State
  const [rateInput, setRateInput] = useState("");
  const [rateStatus, setRateStatus] = useState<ActionStatus>(null);

  const [sgldtTo, setSgldtTo] = useState("");
  const [sgldtAmount, setSgldtAmount] = useState("");
  const [sgldtStatus, setSgldtStatus] = useState<ActionStatus>(null);

  const [ckuniTo, setCkuniTo] = useState("");
  const [ckuniAmount, setCkuniAmount] = useState("");
  const [ckuniStatus, setCkuniStatus] = useState<ActionStatus>(null);

  const sgldtAvailable = balances ? Number(balances.sgldtBalance) / 1e8 : 0;
  const ckuniAvailable = balances ? Number(balances.ckUNIBalance) / 1e18 : 0;
  const humanRate = exchangeRate ? (Number(exchangeRate) / 1e8).toFixed(8) : "—";

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleSaveRate = async () => {
    const parsed = Number.parseFloat(rateInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setRateStatus({ busy: false, ok: false, message: "Enter a positive number" });
      return;
    }
    setRateStatus({ busy: true, message: `Setting rate to ${parsed} sGLDT/UNI…` });
    try {
      await setRateMutation.mutateAsync(BigInt(Math.round(parsed * 1e8)));
      setRateStatus({ busy: false, ok: true, message: `Exchange rate set to ${parsed} sGLDT per UNI` });
      setRateInput("");
    } catch (err) {
      setRateStatus({ busy: false, ok: false, message: err instanceof Error ? err.message : "Failed" });
    }
  };

  const runAdminTransfer = async (
    token: "sGLDT" | "ckUNI",
    toRaw: string,
    amountRaw: string,
    setStatus: (s: ActionStatus) => void,
    clearForm: () => void,
  ) => {
    let principal: Principal;
    try {
      principal = Principal.fromText(toRaw.trim());
    } catch {
      setStatus({ busy: false, ok: false, message: "Invalid recipient principal" });
      return;
    }
    const parsed = Number.parseFloat(amountRaw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setStatus({ busy: false, ok: false, message: "Enter a positive amount" });
      return;
    }
    if (!identity) {
      setStatus({ busy: false, ok: false, message: "Not logged in — reconnect Internet Identity" });
      return;
    }
    const decimals = token === "sGLDT" ? 1e8 : 1e18;
    const amount = BigInt(Math.round(parsed * decimals));
    setStatus({ busy: true, message: `Sending ${parsed} ${token} → ${principal.toString().slice(0, 12)}…` });
    console.log(`[${token} transfer]`, { to: principal.toString(), amount: amount.toString() });
    try {
      const result = await directAdminTransfer({
        identity,
        token,
        to: principal.toString(),
        amount,
      });
      console.log(`[${token} transfer] result:`, result);
      if (result.startsWith("error:")) {
        setStatus({ busy: false, ok: false, message: result.replace(/^error:\s*/, "") });
        return;
      }
      setStatus({ busy: false, ok: true, message: result });
      clearForm();
      refetchBalances();
      refetchWalletInfo();
    } catch (err) {
      console.error(`[${token} transfer] threw:`, err);
      setStatus({
        busy: false,
        ok: false,
        message: err instanceof Error ? err.message : `${token} transfer failed`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Exchange rate */}
      <Section title="UNI → sGLDT Exchange Rate">
        <p className="text-xs text-zinc-500 mb-3">Current rate: <span className="text-yellow-400 font-mono">{humanRate}</span> sGLDT per UNI</p>
        <div className="flex gap-3">
          <Input
            type="number"
            min="0"
            step="0.00000001"
            value={rateInput}
            onChange={(e) => setRateInput(e.target.value)}
            placeholder={humanRate}
            className="flex-1 bg-zinc-800 border-zinc-700 text-white font-mono"
          />
          <Button onClick={handleSaveRate} disabled={!!rateStatus?.busy} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
            {rateStatus?.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set Rate"}
          </Button>
        </div>
        <StatusLine status={rateStatus} />
      </Section>

      {/* sGLDT transfer */}
      <Section title={`Transfer sGLDT from Treasury (balance ${sgldtAvailable.toFixed(4)})`}>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">Recipient Principal</Label>
            <Input value={sgldtTo} onChange={(e) => setSgldtTo(e.target.value)} placeholder="aaaaa-bbbbb-…" className="bg-zinc-800 border-zinc-700 text-white font-mono text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">Amount (sGLDT)</Label>
            <Input type="number" min="0" step="0.00000001" value={sgldtAmount} onChange={(e) => setSgldtAmount(e.target.value)} placeholder="0.00000000" className="bg-zinc-800 border-zinc-700 text-white font-mono text-sm" />
          </div>
        </div>
        <Button
          onClick={() => runAdminTransfer("sGLDT", sgldtTo, sgldtAmount, setSgldtStatus, () => { setSgldtTo(""); setSgldtAmount(""); })}
          disabled={!!sgldtStatus?.busy || !sgldtTo || !sgldtAmount}
          className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
        >
          {sgldtStatus?.busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Transferring</> : <><Send className="w-4 h-4 mr-2" />Transfer sGLDT</>}
        </Button>
        <StatusLine status={sgldtStatus} />
      </Section>

      {/* ckUNI transfer */}
      <Section title={`Transfer ckUNI from Treasury (balance ${ckuniAvailable.toFixed(6)})`}>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">Recipient Principal</Label>
            <Input value={ckuniTo} onChange={(e) => setCkuniTo(e.target.value)} placeholder="aaaaa-bbbbb-…" className="bg-zinc-800 border-zinc-700 text-white font-mono text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">Amount (ckUNI)</Label>
            <Input type="number" min="0" step="0.000000000000000001" value={ckuniAmount} onChange={(e) => setCkuniAmount(e.target.value)} placeholder="0.000000" className="bg-zinc-800 border-zinc-700 text-white font-mono text-sm" />
          </div>
        </div>
        <Button
          onClick={() => runAdminTransfer("ckUNI", ckuniTo, ckuniAmount, setCkuniStatus, () => { setCkuniTo(""); setCkuniAmount(""); })}
          disabled={!!ckuniStatus?.busy || !ckuniTo || !ckuniAmount}
          className="bg-blue-500 hover:bg-blue-400 text-white font-bold"
        >
          {ckuniStatus?.busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Transferring</> : <><Send className="w-4 h-4 mr-2" />Transfer ckUNI</>}
        </Button>
        <StatusLine status={ckuniStatus} />
      </Section>
    </div>
  );
}

// ── Deposits tab ─────────────────────────────────────────────────────────────

function DepositsTab() {
  const { data: deposits, isLoading, refetch, isFetching } = useAllUNIDeposits();
  const { actor } = useBackendActor();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actorAny = actor as any;
  const [payStatus, setPayStatus] = useState<Record<string, ActionStatus>>({});

  const pay = async (id: bigint) => {
    if (!actorAny) {
      setPayStatus((s) => ({ ...s, [String(id)]: { busy: false, ok: false, message: "Actor not ready" } }));
      return;
    }
    setPayStatus((s) => ({ ...s, [String(id)]: { busy: true, message: `Paying deposit #${id}…` } }));
    try {
      const result = (await actorAny.verifyAndPayUNIDeposit(id)) as string;
      const lower = result.toLowerCase();
      const isError = lower.startsWith("error") || lower.startsWith("failed") || lower.startsWith("confirmed_payout_failed");
      setPayStatus((s) => ({
        ...s,
        [String(id)]: { busy: false, ok: !isError, message: result },
      }));
      refetch();
    } catch (err) {
      setPayStatus((s) => ({
        ...s,
        [String(id)]: { busy: false, ok: false, message: err instanceof Error ? err.message : "Payout failed" },
      }));
    }
  };

  if (isLoading) {
    return <div className="text-zinc-500 text-sm">Loading deposits…</div>;
  }

  const sorted = (deposits ?? []).slice().sort((a, b) => {
    // biome-ignore lint/suspicious/noExplicitAny: backend record
    return Number((b as any).timestamp - (a as any).timestamp);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{sorted.length} deposits total</p>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      {sorted.length === 0 && <p className="text-zinc-500 text-sm">No deposits yet.</p>}
      {sorted.map((dep) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = dep as any;
        const statusKey = Object.keys(d.status)[0] as string;
        const statusColor =
          statusKey === "paid" ? "text-emerald-400"
          : statusKey === "failed" ? "text-red-400"
          : statusKey === "confirmed" ? "text-yellow-400"
          : statusKey === "processing" ? "text-blue-400"
          : "text-zinc-400";
        const uniDisplay = (Number(d.uniAmount) / 1e8).toFixed(6);
        const sgldtDisplay = (Number(d.sgldtPaid) / 1e8).toFixed(6);
        const needsPay = statusKey === "confirmed" || statusKey === "failed";
        const entry = payStatus[String(d.id)];
        return (
          <div key={String(d.id)} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="font-mono text-sm font-bold text-white">#{String(d.id)}</span>
              <span className={`t-label ${statusColor}`}>{statusKey}</span>
              <span className="text-xs text-zinc-500 font-mono">{uniDisplay} UNI</span>
              <span className="text-zinc-600 text-xs">→</span>
              <span className="text-xs text-zinc-500 font-mono">{sgldtDisplay} sGLDT</span>
            </div>
            <div className="text-xs text-zinc-600 font-mono break-all mb-2">
              tx: {d.txHash}
            </div>
            <div className="text-xs text-zinc-600 font-mono break-all mb-3">
              submitter: {d.submitter.toString()}
            </div>
            {needsPay && (
              <Button size="sm" onClick={() => pay(d.id)} disabled={!!entry?.busy} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
                {entry?.busy ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Paying</> : "Verify & Pay"}
              </Button>
            )}
            <StatusLine status={entry} />
          </div>
        );
      })}
    </div>
  );
}

// ── Mint & Dissolve tab ──────────────────────────────────────────────────────

function MinterTab() {
  const { data: walletInfo, refetch: refetchWalletInfo } = useGetTreasuryWalletInfo();
  const mintMutation = useAdminMintCkUNI();
  const dissolveMutation = useAdminDissolveCkUNI();
  const initMinterMutation = useAdminInitializeMinterAddress();

  const [mintTxHash, setMintTxHash] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const [mintStatus, setMintStatus] = useState<ActionStatus>(null);

  const [dissolveAmount, setDissolveAmount] = useState("");
  const [dissolveEth, setDissolveEth] = useState("");
  const [dissolveStatus, setDissolveStatus] = useState<ActionStatus>(null);

  const [minterStatus, setMinterStatus] = useState<ActionStatus>(null);

  const depositAddress = walletInfo?.depositAddress || "(not initialized)";

  const handleMint = async () => {
    if (!mintTxHash.trim().startsWith("0x")) {
      setMintStatus({ busy: false, ok: false, message: "Tx hash must start with 0x" });
      return;
    }
    const parsed = Number.parseFloat(mintAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setMintStatus({ busy: false, ok: false, message: "Enter a positive UNI amount" });
      return;
    }
    const amount = BigInt(Math.round(parsed * 1e18));
    setMintStatus({ busy: true, message: `Minting ${parsed} ckUNI…` });
    try {
      const r = await mintMutation.mutateAsync({ ethTxHash: mintTxHash.trim(), uniAmount: amount });
      setMintStatus({ busy: false, ok: true, message: typeof r === "string" ? r : "Mint requested" });
      setMintTxHash("");
      setMintAmount("");
      refetchWalletInfo();
    } catch (err) {
      setMintStatus({ busy: false, ok: false, message: err instanceof Error ? err.message : "Mint failed" });
    }
  };

  const handleDissolve = async () => {
    const parsed = Number.parseFloat(dissolveAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setDissolveStatus({ busy: false, ok: false, message: "Enter a positive ckUNI amount" });
      return;
    }
    if (!dissolveEth.trim().startsWith("0x")) {
      setDissolveStatus({ busy: false, ok: false, message: "Ethereum address must start with 0x" });
      return;
    }
    const amount = BigInt(Math.round(parsed * 1e18));
    setDissolveStatus({ busy: true, message: `Dissolving ${parsed} ckUNI → ${dissolveEth.trim().slice(0, 10)}…` });
    try {
      const r = await dissolveMutation.mutateAsync({ ckUNIAmount: amount, destinationEthAddress: dissolveEth.trim() });
      setDissolveStatus({ busy: false, ok: true, message: typeof r === "string" ? r : "Dissolve submitted" });
      setDissolveAmount("");
      setDissolveEth("");
      refetchWalletInfo();
    } catch (err) {
      setDissolveStatus({ busy: false, ok: false, message: err instanceof Error ? err.message : "Dissolve failed" });
    }
  };

  const handleInitMinter = async () => {
    setMinterStatus({ busy: true, message: "Fetching deposit address…" });
    try {
      const r = await initMinterMutation.mutateAsync();
      if (typeof r === "string" && r.toLowerCase().startsWith("err")) {
        setMinterStatus({ busy: false, ok: false, message: r.replace(/^err:\s*/i, "") });
      } else {
        setMinterStatus({ busy: false, ok: true, message: `Deposit address: ${r}` });
        refetchWalletInfo();
      }
    } catch (err) {
      setMinterStatus({ busy: false, ok: false, message: err instanceof Error ? err.message : "Failed" });
    }
  };

  const copyToClipboard = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* noop */ }
  };

  return (
    <div className="space-y-6">
      <Section title="Ethereum Deposit Address">
        <p className="text-xs text-zinc-500 mb-2">Send UNI to this address on Ethereum; ckUNI is minted to the treasury automatically.</p>
        <div className="flex items-center gap-2 mb-3">
          <code className="flex-1 text-xs text-blue-300 font-mono break-all bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">{depositAddress}</code>
          <Button size="sm" variant="outline" onClick={() => copyToClipboard(depositAddress)}>
            <Copy className="w-3.5 h-3.5" />
          </Button>
        </div>
        <Button size="sm" variant="outline" onClick={handleInitMinter} disabled={!!minterStatus?.busy}>
          {minterStatus?.busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
          Refresh Address
        </Button>
        <StatusLine status={minterStatus} />
      </Section>

      <Section title="Mint ckUNI (record an Ethereum UNI deposit)">
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">Ethereum Tx Hash</Label>
            <Input value={mintTxHash} onChange={(e) => setMintTxHash(e.target.value)} placeholder="0x…" className="bg-zinc-800 border-zinc-700 text-white font-mono text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">UNI Amount (18 decimals)</Label>
            <Input type="number" min="0" step="0.000000000000000001" value={mintAmount} onChange={(e) => setMintAmount(e.target.value)} placeholder="0.000000" className="bg-zinc-800 border-zinc-700 text-white font-mono text-sm" />
          </div>
        </div>
        <Button onClick={handleMint} disabled={!!mintStatus?.busy || !mintTxHash || !mintAmount} className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold">
          {mintStatus?.busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Minting</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Mint ckUNI</>}
        </Button>
        <StatusLine status={mintStatus} />
      </Section>

      <Section title="Dissolve ckUNI → UNI on Ethereum">
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">ckUNI Amount</Label>
            <Input type="number" min="0" step="0.000000000000000001" value={dissolveAmount} onChange={(e) => setDissolveAmount(e.target.value)} placeholder="0.000000" className="bg-zinc-800 border-zinc-700 text-white font-mono text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">Destination Ethereum Address</Label>
            <Input value={dissolveEth} onChange={(e) => setDissolveEth(e.target.value)} placeholder="0x…" className="bg-zinc-800 border-zinc-700 text-white font-mono text-sm" />
          </div>
        </div>
        <Button onClick={handleDissolve} disabled={!!dissolveStatus?.busy || !dissolveAmount || !dissolveEth} className="bg-red-500 hover:bg-red-400 text-white font-bold">
          {dissolveStatus?.busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Dissolving</> : <><Flame className="w-4 h-4 mr-2" />Dissolve</>}
        </Button>
        <StatusLine status={dissolveStatus} />
      </Section>
    </div>
  );
}

// ── Stranded queue ───────────────────────────────────────────────────────────

/** Every refine/redeem whose swap AND auto-refund both failed. The backend
 *  has no one-click resolver on purpose (a wrong auto-release would be
 *  unrecoverable) — resolution is a manual Treasury-tab transfer of the owed
 *  amount to the user's principal, then the record stays as the audit trail. */
function StrandedTab() {
  const { identity } = useInternetIdentity();
  const { data: queue, isLoading, refetch, isFetching } = useStrandedQueue(identity, true);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Section title="Stranded swaps — manual resolution queue">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
          Each row is a user whose funds were pulled but neither paid out nor
          auto-refunded. Resolve by sending the owed amount from the Treasury
          tab to their principal. The public /proof page shows this queue's
          count live.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 gap-1.5 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 justify-center text-zinc-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading queue…
        </div>
      ) : !queue || queue.length === 0 ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-70" />
          <p className="text-sm font-semibold text-emerald-300">
            Queue is empty — no stranded swaps.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((s) => {
            const key = `${s.kind}-${s.id.toString()}`;
            return (
              <div
                key={key}
                className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-xs space-y-1.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-black uppercase tracking-wider text-amber-300">
                    {s.kind} #{s.id.toString()}
                  </span>
                  <span className="text-zinc-500">
                    {new Date(Number(s.timestampNs / 1_000_000n)).toLocaleString()}
                  </span>
                </div>
                <p className="text-zinc-300">
                  Pulled <span className="font-mono text-white">{s.pulled}</span>{" "}
                  from the user · owes them{" "}
                  <span className="font-mono text-white">{s.owed}</span>
                  {s.pullBlock != null && (
                    <span className="text-zinc-500"> · pull block #{s.pullBlock.toString()}</span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-zinc-400 break-all">{s.user}</span>
                  <button
                    type="button"
                    onClick={() => copy(s.user, key)}
                    className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-700 bg-zinc-900 text-[10px] font-bold text-zinc-300 hover:bg-zinc-800"
                  >
                    <Copy className="w-3 h-3" />
                    {copied === key ? "Copied" : "Copy principal"}
                  </button>
                </div>
                {s.errorMsg && (
                  <p className="text-red-300/80 font-mono break-all">{s.errorMsg}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

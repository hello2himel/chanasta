/**
 * The one data interface the UI knows about.
 *
 * Every read and write goes through this module; components never call Supabase
 * or localStorage directly (architecture.md §6). Two implementations share the
 * contract: the local demo store and the Supabase adapter (which maps to the
 * `public_*` views, owner tables under RLS, and the documented RPCs).
 */
import type { AppConfig } from "./config.ts";
import { DataError } from "./errors.ts";
import { LocalStore, browserStorage } from "./local-store.ts";
import {
  DEMO_CREATORS,
  demoClaims,
  demoMethodsFor,
  findDemoCreator,
  isDemoSlug,
} from "./demo.ts";
import {
  getClient,
  loadSession,
  mapCreatorRow,
  mapSupabaseError,
  sendMagicLink,
  signOutClient,
  subscribeAuth,
} from "./supabase.ts";
import type {
  ClaimInput,
  ClaimResult,
  Creator,
  CreatorProfilePatch,
  CreateCreatorInput,
  Lang,
  PaymentMethod,
  PaymentMethodInput,
  ReviewAction,
  Session,
  SupportClaim,
} from "./types.ts";

export interface DataApi {
  readonly mode: "local" | "supabase";
  getCreator(slug: string): Promise<Creator | null>;
  listPublishedCreators(): Promise<Creator[]>;
  getMyCreator(): Promise<Creator | null>;
  createCreator(input: CreateCreatorInput): Promise<Creator>;
  updateCreator(id: string, patch: CreatorProfilePatch): Promise<Creator>;
  setCreatorStatus(id: string, status: "published" | "draft"): Promise<Creator>;
  changeSlug(id: string, slug: string): Promise<Creator>;
  softDeleteCreator(id: string): Promise<void>;
  isSlugAvailable(slug: string): Promise<boolean>;

  listPaymentMethods(slug: string): Promise<PaymentMethod[]>;
  listMyPaymentMethods(creatorId: string): Promise<PaymentMethod[]>;
  savePaymentMethod(input: PaymentMethodInput): Promise<PaymentMethod>;
  deletePaymentMethod(id: string): Promise<void>;
  reorderPaymentMethods(ids: string[]): Promise<void>;

  listPublicClaims(slug: string): Promise<SupportClaim[]>;
  listMyClaims(creatorId: string): Promise<SupportClaim[]>;
  submitClaim(input: ClaimInput): Promise<ClaimResult>;
  reviewClaim(claimId: string, action: ReviewAction): Promise<SupportClaim>;

  getSession(): Promise<Session | null>;
  onAuthChange(callback: (session: Session | null) => void): () => void;
  signInWithMagicLink(email: string, redirectTo: string): Promise<void>;
  signOut(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Local demo mode
// ---------------------------------------------------------------------------

export class LocalData implements DataApi {
  readonly mode = "local" as const;
  private readonly store: LocalStore;

  constructor(storage: ReturnType<typeof browserStorage> = browserStorage()) {
    this.store = new LocalStore(storage);
  }

  async getCreator(slug: string): Promise<Creator | null> {
    const demo = findDemoCreator(slug);
    if (demo) return demo.status === "published" ? demo : null;
    const local = this.store.getCreatorBySlug(slug);
    if (!local || local.deleted_at || local.status === "suspended") return null;
    return local;
  }

  async listPublishedCreators(): Promise<Creator[]> {
    return DEMO_CREATORS.filter((creator) => creator.status === "published");
  }

  async getMyCreator(): Promise<Creator | null> {
    return this.store.getOwner();
  }

  async createCreator(input: CreateCreatorInput): Promise<Creator> {
    return this.store.createCreator(input);
  }

  async updateCreator(id: string, patch: CreatorProfilePatch): Promise<Creator> {
    return this.store.updateCreator(id, patch);
  }

  async setCreatorStatus(id: string, status: "published" | "draft"): Promise<Creator> {
    return this.store.setCreatorStatus(id, status);
  }

  async changeSlug(id: string, slug: string): Promise<Creator> {
    return this.store.changeSlug(id, slug);
  }

  async softDeleteCreator(id: string): Promise<void> {
    this.store.softDeleteCreator(id);
  }

  async isSlugAvailable(slug: string): Promise<boolean> {
    return this.store.isSlugAvailable(slug);
  }

  async listPaymentMethods(slug: string): Promise<PaymentMethod[]> {
    if (isDemoSlug(slug)) return demoMethodsFor(slug);
    const creator = this.store.getCreatorBySlug(slug);
    if (!creator || creator.deleted_at) return [];
    return this.store.listMethodsForCreator(creator.id, { includeDisabled: false });
  }

  async listMyPaymentMethods(creatorId: string): Promise<PaymentMethod[]> {
    return this.store.listMethodsForCreator(creatorId, { includeDisabled: true });
  }

  async savePaymentMethod(input: PaymentMethodInput): Promise<PaymentMethod> {
    return this.store.savePaymentMethod(input);
  }

  async deletePaymentMethod(id: string): Promise<void> {
    this.store.deletePaymentMethod(id);
  }

  async reorderPaymentMethods(ids: string[]): Promise<void> {
    this.store.reorderPaymentMethods(ids);
  }

  async listPublicClaims(slug: string): Promise<SupportClaim[]> {
    const stored = this.store.listClaimsForSlug(slug, { publicOnly: true });
    if (isDemoSlug(slug)) {
      const demo = demoClaims().filter(
        (claim) => claim.creator_slug === slug && (claim.status === "unverified" || claim.status === "confirmed"),
      );
      return [...stored, ...demo].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    }
    return stored;
  }

  async listMyClaims(creatorId: string): Promise<SupportClaim[]> {
    const creator = this.store.getOwner();
    if (!creator || creator.id !== creatorId) return [];
    return this.store.listMyClaims();
  }

  async submitClaim(input: ClaimInput): Promise<ClaimResult> {
    return this.store.submitClaim(input);
  }

  async reviewClaim(claimId: string, action: ReviewAction): Promise<SupportClaim> {
    return this.store.reviewClaim(claimId, action);
  }

  async getSession(): Promise<Session | null> {
    return { user_id: "local-browser", email: null, is_demo: true };
  }

  onAuthChange(): () => void {
    return () => undefined;
  }

  async signInWithMagicLink(): Promise<void> {
    throw new DataError("AUTH_FAILED", "Magic links need Supabase mode.");
  }

  async signOut(): Promise<void> {
    /* nothing to sign out of in local mode */
  }
}

// ---------------------------------------------------------------------------
// Supabase mode
// ---------------------------------------------------------------------------

function rowToCreator(row: Record<string, unknown>): Creator {
  const mapped = mapCreatorRow(row) ?? {};
  const now = new Date().toISOString();
  return {
    id: typeof mapped.id === "string" ? mapped.id : "",
    user_id: typeof mapped.user_id === "string" ? mapped.user_id : undefined,
    slug: typeof mapped.slug === "string" ? mapped.slug : "",
    display_name: typeof mapped.display_name === "string" ? mapped.display_name : "",
    tagline: (mapped.tagline as string | null) ?? null,
    bio: (mapped.bio as string | null) ?? null,
    avatar_emoji: (mapped.avatar_emoji as string) ?? "☕",
    socials: (mapped.socials as Record<string, string>) ?? {},
    goal_amount_bdt: typeof mapped.goal_amount_bdt === "number" ? mapped.goal_amount_bdt : null,
    goal_note: (mapped.goal_note as string | null) ?? null,
    default_locale: (mapped.default_locale as Lang) ?? "bn",
    status: mapped.status === "draft" || mapped.status === "suspended" ? mapped.status : "published",
    verified: mapped.verified === true,
    published_at: (mapped.published_at as string | null) ?? null,
    updated_at: typeof mapped.updated_at === "string" ? mapped.updated_at : now,
    created_at: typeof mapped.created_at === "string" ? mapped.created_at : now,
    deleted_at: (mapped.deleted_at as string | null) ?? null,
    last_slug_change_at: (mapped.last_slug_change_at as string | null) ?? null,
    is_demo: false,
  };
}

function rowToMethod(row: Record<string, unknown>): PaymentMethod {
  return {
    id: String(row.id ?? ""),
    creator_id: typeof row.creator_id === "string" ? row.creator_id : "",
    creator_slug: typeof row.creator_slug === "string" ? row.creator_slug : undefined,
    kind: (row.kind as PaymentMethod["kind"]) ?? "other",
    label: typeof row.label === "string" ? row.label : "",
    account_number: (row.account_number as string | null) ?? null,
    account_holder: (row.account_holder as string | null) ?? null,
    bank_name: (row.bank_name as string | null) ?? null,
    branch: (row.branch as string | null) ?? null,
    routing_number: (row.routing_number as string | null) ?? null,
    qr_payload: (row.qr_payload as string | null) ?? null,
    qr_image_path: (row.qr_image_path as string | null) ?? null,
    qr_status: (row.qr_status as PaymentMethod["qr_status"]) ?? "none",
    qr_decoded: (row.qr_decoded as PaymentMethod["qr_decoded"]) ?? null,
    sort_order: typeof row.sort_order === "number" ? row.sort_order : 0,
    enabled: row.enabled !== false,
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString(),
  };
}

function rowToClaim(row: Record<string, unknown>): SupportClaim {
  return {
    id: String(row.id ?? ""),
    creator_id: typeof row.creator_id === "string" ? row.creator_id : "",
    creator_slug: typeof row.creator_slug === "string" ? row.creator_slug : undefined,
    amount_bdt: typeof row.amount_bdt === "number" ? row.amount_bdt : Number(row.amount_bdt ?? 0),
    payment_method_id: (row.payment_method_id as string | null) ?? null,
    method_kind: (row.method_kind as SupportClaim["method_kind"]) ?? null,
    supporter_name: (row.supporter_name as string | null) ?? null,
    message: (row.message as string | null) ?? null,
    txid: (row.txid as string | null) ?? null,
    status: (row.status as SupportClaim["status"]) ?? "unverified",
    created_at: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
    confirmed_at: (row.confirmed_at as string | null) ?? null,
    hidden_at: (row.hidden_at as string | null) ?? null,
    rejected_at: (row.rejected_at as string | null) ?? null,
  };
}

export class SupabaseData implements DataApi {
  readonly mode = "supabase" as const;
  private readonly config: AppConfig;
  private readonly unsubscribe: Array<() => void> = [];

  constructor(config: AppConfig) {
    this.config = config;
  }

  private async client() {
    return getClient(this.config);
  }

  private async uid(): Promise<string | null> {
    const client = await this.client();
    const { user } = await loadSession(client);
    return user?.id ?? null;
  }

  private async requireUid(): Promise<string> {
    const uid = await this.uid();
    if (!uid) throw new DataError("AUTH_REQUIRED", "Log in first.");
    return uid;
  }

  async getCreator(slug: string): Promise<Creator | null> {
    try {
      const client = await this.client();
      const { data, error } = await client
        .from("public_creators")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw mapSupabaseError(error);
      return data ? rowToCreator(data as Record<string, unknown>) : null;
    } catch (error) {
      throw mapSupabaseError(error);
    }
  }

  async listPublishedCreators(): Promise<Creator[]> {
    try {
      const client = await this.client();
      const { data, error } = await client
        .from("public_creators")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(24);
      if (error) throw mapSupabaseError(error);
      return (data ?? []).map((row) => rowToCreator(row as Record<string, unknown>));
    } catch (error) {
      throw mapSupabaseError(error);
    }
  }

  async getMyCreator(): Promise<Creator | null> {
    const uid = await this.uid();
    if (!uid) return null;
    try {
      const client = await this.client();
      const { data, error } = await client
        .from("creators")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw mapSupabaseError(error);
      return data ? rowToCreator(data as Record<string, unknown>) : null;
    } catch (error) {
      throw mapSupabaseError(error);
    }
  }

  async createCreator(input: CreateCreatorInput): Promise<Creator> {
    const uid = await this.requireUid();
    try {
      const client = await this.client();
      const { data, error } = await client
        .from("creators")
        .insert({
          user_id: uid,
          slug: input.slug,
          display_name: input.display_name,
          tagline: input.tagline ?? null,
          bio: input.bio ?? null,
          avatar_emoji: input.avatar_emoji ?? "☕",
          default_locale: input.default_locale ?? "bn",
        })
        .select("*")
        .single();
      if (error) throw mapSupabaseError(error);
      return rowToCreator(data as Record<string, unknown>);
    } catch (error) {
      throw mapSupabaseError(error);
    }
  }

  async updateCreator(id: string, patch: CreatorProfilePatch): Promise<Creator> {
    await this.requireUid();
    try {
      const client = await this.client();
      const { data, error } = await client.from("creators").update(patch).eq("id", id).select("*").single();
      if (error) throw mapSupabaseError(error);
      return rowToCreator(data as Record<string, unknown>);
    } catch (error) {
      throw mapSupabaseError(error);
    }
  }

  async setCreatorStatus(id: string, status: "published" | "draft"): Promise<Creator> {
    await this.requireUid();
    try {
      const client = await this.client();
      const { error } = await client.rpc("creator_set_status", {
        p_status: status === "published" ? "publish" : "unpublish",
      });
      if (error) throw mapSupabaseError(error);
      const { data, error: readError } = await client.from("creators").select("*").eq("id", id).single();
      if (readError) throw mapSupabaseError(readError);
      return rowToCreator(data as Record<string, unknown>);
    } catch (error) {
      throw mapSupabaseError(error);
    }
  }

  async changeSlug(id: string, slug: string): Promise<Creator> {
    await this.requireUid();
    try {
      const client = await this.client();
      const { error } = await client.rpc("creator_change_slug", { p_slug: slug });
      if (error) throw mapSupabaseError(error);
      const { data, error: readError } = await client.from("creators").select("*").eq("id", id).single();
      if (readError) throw mapSupabaseError(readError);
      return rowToCreator(data as Record<string, unknown>);
    } catch (error) {
      throw mapSupabaseError(error);
    }
  }

  async softDeleteCreator(id: string): Promise<void> {
    await this.requireUid();
    try {
      const client = await this.client();
      const { error } = await client
        .from("creators")
        .update({ deleted_at: new Date().toISOString(), status: "suspended" })
        .eq("id", id);
      if (error) throw mapSupabaseError(error);
    } catch (error) {
      throw mapSupabaseError(error);
    }
  }

  async isSlugAvailable(slug: string): Promise<boolean> {
    try {
      const client = await this.client();
      const { data, error } = await client.rpc("is_slug_available", { p_slug: slug });
      if (error) throw mapSupabaseError(error);
      return data === true;
    } catch (error) {
      throw mapSupabaseError(error);
    }
  }

  async listPaymentMethods(slug: string): Promise<PaymentMethod[]> {
    try {
      const client = await this.client();
      const { data, error } = await client
        .from("public_payment_methods")
        .select("*")
        .eq("creator_slug", slug)
        .order("sort_order", { ascending: true });
      if (error) throw mapSupabaseError(error);
      return (data ?? []).map((row) => rowToMethod(row as Record<string, unknown>));
    } catch (error) {
      throw mapSupabaseError(error);
    }
  }

  async listMyPaymentMethods(creatorId: string): Promise<PaymentMethod[]> {
    await this.requireUid();
    try {
      const client = await this.client();
      const { data, error } = await client
        .from("payment_methods")
        .select("*")
        .eq("creator_id", creatorId)
        .order("sort_order", { ascending: true });
      if (error) throw mapSupabaseError(error);
      return (data ?? []).map((row) => rowToMethod(row as Record<string, unknown>));
    } catch (error) {
      throw mapSupabaseError(error);
    }
  }

  async savePaymentMethod(input: PaymentMethodInput): Promise<PaymentMethod> {
    await this.requireUid();
    try {
      const client = await this.client();
      const payload = {
        creator_id: input.creator_id,
        kind: input.kind,
        label: input.label,
        account_number: input.account_number ?? null,
        account_holder: input.account_holder ?? null,
        bank_name: input.bank_name ?? null,
        branch: input.branch ?? null,
        routing_number: input.routing_number ?? null,
        qr_payload: input.qr_payload ?? null,
        qr_image_path: input.qr_image_path ?? null,
        qr_status: input.qr_status ?? "none",
        qr_decoded: input.qr_decoded ?? null,
        sort_order: input.sort_order ?? 0,
        enabled: input.enabled ?? true,
      };
      const query = input.id
        ? client.from("payment_methods").update(payload).eq("id", input.id).select("*").single()
        : client.from("payment_methods").insert(payload).select("*").single();
      const { data, error } = await query;
      if (error) throw mapSupabaseError(error);
      return rowToMethod(data as Record<string, unknown>);
    } catch (error) {
      throw mapSupabaseError(error);
    }
  }

  async deletePaymentMethod(id: string): Promise<void> {
    await this.requireUid();
    try {
      const client = await this.client();
      const { error } = await client.from("payment_methods").delete().eq("id", id);
      if (error) throw mapSupabaseError(error);
    } catch (error) {
      throw mapSupabaseError(error);
    }
  }

  async reorderPaymentMethods(ids: string[]): Promise<void> {
    await this.requireUid();
    try {
      const client = await this.client();
      // Atomic permutation via `public.creator_reorder_payment_methods`; a
      // per-row UPDATE loop would collide with the (creator_id, sort_order)
      // unique constraint and leave a half-applied order behind.
      const { error } = await client.rpc("creator_reorder_payment_methods", { p_ids: ids });
      if (error) throw mapSupabaseError(error);
    } catch (error) {
      throw mapSupabaseError(error);
    }
  }

  async listPublicClaims(slug: string): Promise<SupportClaim[]> {
    try {
      const client = await this.client();
      const { data, error } = await client
        .from("public_support_claims")
        .select("id,creator_slug,amount_bdt,supporter_name,message,method_kind,status,created_at")
        .eq("creator_slug", slug)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw mapSupabaseError(error);
      return (data ?? []).map((row) => rowToClaim(row as Record<string, unknown>));
    } catch (error) {
      throw mapSupabaseError(error);
    }
  }

  async listMyClaims(creatorId: string): Promise<SupportClaim[]> {
    await this.requireUid();
    try {
      const client = await this.client();
      const { data, error } = await client
        .from("support_claims")
        .select("*")
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false });
      if (error) throw mapSupabaseError(error);
      return (data ?? []).map((row) => rowToClaim(row as Record<string, unknown>));
    } catch (error) {
      throw mapSupabaseError(error);
    }
  }

  async submitClaim(input: ClaimInput): Promise<ClaimResult> {
    try {
      const client = await this.client();
      const { data, error } = await client.rpc("submit_support_claim", {
        p_slug: input.creator_slug,
        p_amount: input.amount_bdt,
        p_name: input.supporter_name ?? null,
        p_message: input.message ?? null,
        p_txid: input.txid ?? null,
        p_method_kind: input.method_kind ?? null,
        p_ip_hash: null,
      });
      if (error) throw mapSupabaseError(error);
      const row = (data ?? {}) as Record<string, unknown>;
      return {
        id: String(row.id ?? ""),
        status: (row.status as ClaimResult["status"]) ?? "unverified",
        created_at: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
      };
    } catch (error) {
      throw mapSupabaseError(error);
    }
  }

  async reviewClaim(claimId: string, action: ReviewAction): Promise<SupportClaim> {
    await this.requireUid();
    try {
      const client = await this.client();
      const { data, error } = await client.rpc("review_support_claim", {
        p_claim_id: claimId,
        p_action: action,
      });
      if (error) throw mapSupabaseError(error);
      const row = (data ?? {}) as Record<string, unknown>;
      if (row.id && row.amount_bdt !== undefined) return rowToClaim(row);
      const { data: fresh, error: readError } = await client
        .from("support_claims")
        .select("*")
        .eq("id", claimId)
        .single();
      if (readError) throw mapSupabaseError(readError);
      return rowToClaim(fresh as Record<string, unknown>);
    } catch (error) {
      throw mapSupabaseError(error);
    }
  }

  async getSession(): Promise<Session | null> {
    try {
      const client = await this.client();
      const { user } = await loadSession(client);
      if (!user) return null;
      return { user_id: user.id, email: user.email ?? null, is_demo: false };
    } catch {
      return null;
    }
  }

  onAuthChange(callback: (session: Session | null) => void): () => void {
    let active = true;
    let unsubscribe: (() => void) | null = null;
    void this.client()
      .then((client) => subscribeAuth(client, (user) => {
        if (!active) return;
        callback(user ? { user_id: user.id, email: user.email ?? null, is_demo: false } : null);
      }))
      .then((fn) => {
        if (!active) fn();
        else unsubscribe = fn;
      })
      .catch(() => undefined);

    const dispose = () => {
      active = false;
      unsubscribe?.();
    };
    this.unsubscribe.push(dispose);
    return dispose;
  }

  async signInWithMagicLink(email: string, redirectTo: string): Promise<void> {
    const client = await this.client();
    await sendMagicLink(client, email, redirectTo);
  }

  async signOut(): Promise<void> {
    const client = await this.client();
    await signOutClient(client);
  }
}

// ---------------------------------------------------------------------------
// Singleton access
// ---------------------------------------------------------------------------

let dataApi: DataApi | null = null;

export function initData(config: AppConfig): DataApi {
  dataApi = config.mode === "supabase" ? new SupabaseData(config) : new LocalData();
  return dataApi;
}

export function getData(): DataApi {
  if (!dataApi) {
    // Defensive default: a component rendered before boot must never crash.
    dataApi = new LocalData();
  }
  return dataApi;
}

export type { AppConfig };

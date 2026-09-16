import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { type ActionFeedback, type RecommendationFeedback } from "@/components/action-feedback";
import {
  createChecklistItem,
  createGiftShare,
  deleteChecklistItem,
  deleteGiftReservation,
  fetchWorkspace,
  getGiftShare,
  revokeGiftShare,
  toggleMilestone,
  updateBudget,
  updateChecklistItem,
  updateGiftReservation,
  updateProfile,
  type CategoryKey,
  type GiftReservationStatus,
  type ItemStatus,
  type ServerChecklistItem,
  type UpdateProfileInput,
  type Workspace,
} from "@/lib/api";
import { getAuthErrorMessage } from "@/lib/errors";
import { adaptItem, type ChecklistItem } from "@/lib/items";
import { type Recommendation } from "@/lib/recommendations";

/**
 * Estado das telas logadas: a query do workspace, a do link de presentes, todas
 * as mutations, os avisos e os handlers que os painéis recebem.
 */
export function useWorkspace(uid: string) {
  const qc = useQueryClient();

  // When the signed-in user changes (e.g. same browser, different account),
  // remove all workspace cache entries so the new user starts fresh.
  useEffect(() => {
    return () => {
      qc.removeQueries({ queryKey: ["workspace"] });
    };
  }, [uid, qc]);

  // Scope every cache entry by userId so different accounts in the same
  // browser session can never share cached workspace data.
  const wqKey = ["workspace", uid] as const;

  const workspaceQuery = useQuery({
    queryKey: wqKey,
    queryFn: fetchWorkspace,
    // As gravações atualizam o cache com a resposta da API (M9); o recarregamento
    // completo fica para erros e para a volta ao app depois de um tempo.
    staleTime: 5 * 60_000,
  });
  const shareQuery = useQuery({
    queryKey: ["gift-share", uid],
    queryFn: getGiftShare,
    staleTime: Infinity,
  });

  const [location, setLocation] = useLocation();
  const [addOpen, setAddOpen] = useState(false);
  const [addCategory, setAddCategory] = useState<CategoryKey>("Roupas");
  const [addTrigger, setAddTrigger] = useState<string | null>(null);
  const [recommendationFocusId, setRecommendationFocusId] = useState<string | null>(null);
  const [recommendationFeedback, setRecommendationFeedback] = useState<RecommendationFeedback | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);

  // Um aviso é sobre a tela onde aconteceu: ao trocar de rota ele sai.
  const [feedbackLocation, setFeedbackLocation] = useState(location);
  if (feedbackLocation !== location) {
    setFeedbackLocation(location);
    setActionFeedback(null);
  }

  const showActionFeedback = (feedback: ActionFeedback) => {
    setActionFeedback(feedback);
    if (feedback.tone === "success") {
      // Avisos com ação (o "Desfazer" da remoção) ficam mais tempo: 3s não dá
      // para ler a frase e decidir.
      window.setTimeout(() => {
        setActionFeedback((current) => current?.message === feedback.message ? null : current);
      }, feedback.action ? 8000 : 3200);
    }
  };

  // ── Mutations ────────────────────────────────────────────────────────────

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    // A confirmação aparece dentro do próprio perfil ("Perfil salvo."): um aviso só.
    onSuccess: (profile) => {
      qc.setQueryData<Workspace>(wqKey, (old) => old ? { ...old, profile } : old);
    },
    onError: () => showActionFeedback({ tone: "error", message: "Não foi possível salvar o perfil. Revise sua conexão e tente novamente." }),
  });

  const addItemMutation = useMutation({
    mutationFn: createChecklistItem,
    onSuccess: (item) => {
      qc.setQueryData<Workspace>(wqKey, (old) =>
        old ? { ...old, items: [...old.items, item] } : old,
      );
      showActionFeedback({ tone: "success", message: "Item adicionado à sua lista." });
    },
    onError: () => showActionFeedback({ tone: "error", message: "Não foi possível adicionar o item. Tente novamente." }),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; category?: CategoryKey; status?: ItemStatus; qty?: number; price?: number; recommendationId?: string | null } }) =>
      updateChecklistItem(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: wqKey });
      const prev = qc.getQueryData<Workspace>(wqKey);
      // A API guarda price como numeric (string); o formulário manda número.
      const { price, ...rest } = data;
      const patch: Partial<ServerChecklistItem> =
        price === undefined ? rest : { ...rest, price: String(price) };
      qc.setQueryData<Workspace>(wqKey, (old) =>
        old ? { ...old, items: old.items.map((i) => i.id === id ? { ...i, ...patch } : i) } : old,
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(wqKey, ctx.prev);
      void qc.invalidateQueries({ queryKey: wqKey });
      showActionFeedback({ tone: "error", message: "A alteração não foi salva e o estado anterior foi restaurado." });
    },
    onSuccess: (item, { data }) => {
      qc.setQueryData<Workspace>(wqKey, (old) =>
        old ? { ...old, items: old.items.map((i) => i.id === item.id ? item : i) } : old,
      );
      if (!("recommendationId" in data)) {
        showActionFeedback({ tone: "success", message: "Item atualizado na sua lista." });
      }
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: deleteChecklistItem,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: wqKey });
      const prev = qc.getQueryData<Workspace>(wqKey);
      qc.setQueryData<Workspace>(wqKey, (old) =>
        old ? { ...old, items: old.items.filter((i) => i.id !== id) } : old,
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(wqKey, ctx.prev);
      void qc.invalidateQueries({ queryKey: wqKey });
      showActionFeedback({ tone: "error", message: "Não foi possível remover o item. Ele foi restaurado na lista." });
    },
    // O aviso (com "Desfazer") é dado por quem chama, que conhece o item.
    // A remoção otimista já deixou o cache certo; nada a recarregar.
  });

  const createShareMutation = useMutation({
    mutationFn: createGiftShare,
    onSuccess: (share) => {
      qc.setQueryData(["gift-share", uid], share);
      showActionFeedback({ tone: "success", message: "Novo link de presentes criado." });
    },
    onError: () => showActionFeedback({ tone: "error", message: "Não foi possível criar o link de presentes." }),
  });

  const revokeShareMutation = useMutation({
    mutationFn: revokeGiftShare,
    onSuccess: () => {
      qc.setQueryData(["gift-share", uid], null);
      showActionFeedback({ tone: "success", message: "O link público foi revogado." });
    },
    onError: () => showActionFeedback({ tone: "error", message: "Não foi possível revogar o link público." }),
  });

  const updateGiftReservationMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: GiftReservationStatus }) =>
      updateGiftReservation(id, { status }),
    onSuccess: (reservation) => {
      qc.setQueryData<Workspace>(wqKey, (old) => old
        ? { ...old, giftReservations: old.giftReservations.map((current) => current.id === reservation.id ? reservation : current) }
        : old);
      showActionFeedback({ tone: "success", message: "Status do presente atualizado." });
    },
    onError: () => showActionFeedback({ tone: "error", message: "Não foi possível atualizar o presente." }),
  });

  const deleteGiftReservationMutation = useMutation({
    mutationFn: deleteGiftReservation,
    onSuccess: (_result, id) => {
      qc.setQueryData<Workspace>(wqKey, (old) => old
        ? { ...old, giftReservations: old.giftReservations.filter((reservation) => reservation.id !== id) }
        : old);
      showActionFeedback({ tone: "success", message: "Reserva desfeita e item liberado." });
    },
    onError: () => showActionFeedback({ tone: "error", message: "Não foi possível desfazer a reserva." }),
  });

  const milestoneMutation = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) => toggleMilestone(id, completed),
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: wqKey });
      const prev = qc.getQueryData<Workspace>(wqKey);
      qc.setQueryData<Workspace>(wqKey, (old) =>
        old ? { ...old, milestones: old.milestones.map((m) => m.id === id ? { ...m, completed } : m) } : old,
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(wqKey, ctx.prev);
      void qc.invalidateQueries({ queryKey: wqKey });
      showActionFeedback({ tone: "error", message: "Não foi possível atualizar o marco. O estado anterior foi restaurado." });
    },
    onSuccess: (milestone, { completed }) => {
      qc.setQueryData<Workspace>(wqKey, (old) =>
        old ? { ...old, milestones: old.milestones.map((m) => m.id === milestone.id ? milestone : m) } : old,
      );
      showActionFeedback({
        tone: "success",
        message: completed ? "Marco concluído." : "Marco voltou para pendente.",
      });
    },
  });

  const budgetMutation = useMutation({
    mutationFn: (categories: Array<{ category: string; planned: number }>) =>
      updateBudget({ categories }),
    // A confirmação e o erro aparecem dentro do próprio card do orçamento
    // (BudgetPanel), junto dos valores: um aviso só, no lugar certo.
    onSuccess: (budget) => {
      qc.setQueryData<Workspace>(wqKey, (old) => old ? { ...old, budget } : old);
    },
  });

  const profileSaveState: "idle" | "saving" | "error" | "success" = profileMutation.isPending
    ? "saving"
    : profileMutation.isError
      ? "error"
      : profileMutation.isSuccess
        ? "success"
        : "idle";
  const profileSaveError = profileMutation.error instanceof Error ? profileMutation.error.message : null;
  const budgetSaveState: "idle" | "saving" | "error" | "success" = budgetMutation.isPending
    ? "saving"
    : budgetMutation.isError
      ? "error"
      : budgetMutation.isSuccess
        ? "success"
        : "idle";

  // ── Derived data ─────────────────────────────────────────────────────────

  const giftReservations = workspaceQuery.data?.giftReservations ?? [];
  const reservationsByItem = new Map(giftReservations.map((reservation) => [reservation.checklistItemId, reservation]));
  const items = (workspaceQuery.data?.items ?? []).map((item) => adaptItem(item, reservationsByItem.get(item.id) ?? null));

  // ── Navigation helpers ───────────────────────────────────────────────────

  const go = (path: string) => setLocation(path);

  const openAdd = (cat: CategoryKey) => {
    setAddTrigger(document.activeElement?.getAttribute("data-testid") ?? null);
    setAddCategory(cat);
    setAddOpen(true);
  };

  /** Id do item que está gravando: as outras linhas continuam utilizáveis. */
  const pendingItemId =
    updateItemMutation.isPending ? updateItemMutation.variables?.id ?? null
      : deleteItemMutation.isPending ? deleteItemMutation.variables ?? null
        : null;

  const handleAddItem = async (values: { name: string; category: CategoryKey; qty: number; price: number }) => {
    await addItemMutation.mutateAsync(values);
    setAddOpen(false);
  };

  const handleEditItem = async (id: number, values: { name: string; category: CategoryKey; qty: number; price: number }) => {
    await updateItemMutation.mutateAsync({ id, data: values });
  };

  const handleToggle = (id: number, status: ItemStatus) => {
    updateItemMutation.mutate({ id, data: { status } });
  };

  /** Remove na hora e oferece desfazer: recria o item com os mesmos dados. */
  const handleDelete = (id: number) => {
    const item = items.find((current) => current.id === id);
    if (!item) return;
    deleteItemMutation.mutate(id, {
      onSuccess: () => showActionFeedback({
        tone: "success",
        message: `“${item.name}” saiu da lista.`,
        action: {
          label: "Desfazer",
          onAction: () => addItemMutation.mutate({
            name: item.name,
            category: item.category,
            group: item.group,
            qty: item.qty,
            price: item.price,
          }),
        },
      }),
    });
  };

  const handleAddRecommendation = (recommendation: Recommendation) => {
    setRecommendationFeedback(null);
    addItemMutation.mutate(
      {
        name: recommendation.name,
        category: recommendation.category,
        group: "Inspiração Ninho",
        price: recommendation.price ?? 0,
        recommendationId: recommendation.id,
      },
      {
        onSuccess: () => setRecommendationFeedback({ tone: "success", message: "Inspiração salva na sua lista como “A comprar”." }),
        onError: (error) => setRecommendationFeedback({
          tone: "error",
          message: error instanceof Error && error.message ? error.message : "Não foi possível salvar esta inspiração agora.",
        }),
      },
    );
  };

  const handleLinkRecommendation = (recommendation: Recommendation, item: ChecklistItem) => {
    setRecommendationFeedback(null);
    updateItemMutation.mutate(
      { id: item.id, data: { recommendationId: recommendation.id } },
      {
        onSuccess: () => setRecommendationFeedback({ tone: "success", message: "Inspiração vinculada ao item da sua lista." }),
        onError: (error) => setRecommendationFeedback({
          tone: "error",
          message: error instanceof Error && error.message ? error.message : "Não foi possível vincular esta inspiração agora.",
        }),
      },
    );
  };

  const handleUnlinkRecommendation = (id: number) => {
    updateItemMutation.mutate(
      { id, data: { recommendationId: null } },
      {
        onSuccess: () => setRecommendationFeedback({ tone: "success", message: "A inspiração foi desvinculada; o item continua na sua lista." }),
        onError: (error) => setRecommendationFeedback({
          tone: "error",
          message: error instanceof Error && error.message ? error.message : "Não foi possível desvincular esta inspiração agora.",
        }),
      },
    );
  };

  const handleMilestoneToggle = (id: number, completed: boolean) => {
    milestoneMutation.mutate({ id, completed });
  };

  const handleProfileSave = (data: UpdateProfileInput) => {
    profileMutation.reset();
    profileMutation.mutate(data);
  };

  const handleBudgetSave = (cats: Array<{ category: string; planned: number }>) => {
    budgetMutation.mutate(cats);
  };

  const handleReleaseGiftReservation = (reservationId: number) => {
    deleteGiftReservationMutation.mutate(reservationId);
  };

  const handleUpdateGiftReservation = (reservationId: number, status: GiftReservationStatus) => {
    updateGiftReservationMutation.mutate({ id: reservationId, status });
  };

  const handleOnboardingComplete = () => qc.invalidateQueries({ queryKey: wqKey });

  const handleOpenRecommendation = (id: string) => {
    setRecommendationFocusId(id);
    go("/recommendations");
  };

  const handleBudgetEdit = () => budgetMutation.reset();

  const handleCreateShare = () => {
    createShareMutation.reset();
    createShareMutation.mutate();
  };

  const handleRevokeShare = () => {
    revokeShareMutation.reset();
    revokeShareMutation.mutate();
  };

  const shareLoading = createShareMutation.isPending || revokeShareMutation.isPending;
  const shareError =
    createShareMutation.isError ? getAuthErrorMessage(createShareMutation.error)
      : revokeShareMutation.isError ? getAuthErrorMessage(revokeShareMutation.error)
        : null;

  return {
    workspaceQuery,
    shareQuery,
    location,
    items,
    go,
    addOpen,
    addCategory,
    addTrigger,
    closeAdd: () => setAddOpen(false),
    editingItem,
    setEditingItem,
    recommendationFocusId,
    recommendationFeedback,
    actionFeedback,
    dismissActionFeedback: () => setActionFeedback(null),
    pendingItemId,
    isAddPending: addItemMutation.isPending,
    isRecommendationActionPending: addItemMutation.isPending || updateItemMutation.isPending,
    isMilestonePending: milestoneMutation.isPending,
    profileSaveState,
    profileSaveError,
    budgetSaveState,
    shareLoading,
    shareError,
    openAdd,
    handleAddItem,
    handleEditItem,
    handleToggle,
    handleDelete,
    handleAddRecommendation,
    handleLinkRecommendation,
    handleUnlinkRecommendation,
    handleOpenRecommendation,
    handleMilestoneToggle,
    handleProfileSave,
    handleBudgetSave,
    handleBudgetEdit,
    handleReleaseGiftReservation,
    handleUpdateGiftReservation,
    handleCreateShare,
    handleRevokeShare,
    handleOnboardingComplete,
  };
}

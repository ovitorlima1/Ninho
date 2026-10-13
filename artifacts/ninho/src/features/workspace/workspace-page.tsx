import { ActionFeedbackBanner } from "@/components/action-feedback";
import { ErrorState, LoadingSpinner } from "@/components/states";
import { AppShell, ListScreen, type ListTab } from "@/layout/app-shell";
import { BudgetPanel } from "@/features/budget/budget-panel";
import { ChecklistPanel } from "@/features/checklist/checklist-panel";
import { AddItemModal, EditItemModal } from "@/features/checklist/item-modals";
import { GiftListDetail } from "@/features/gift-lists/gift-list-detail";
import { GiftListsPanel } from "@/features/gift-lists/gift-lists-panel";
import { OnboardingModal } from "@/features/onboarding/onboarding-modal";
import { OverviewPanel } from "@/features/overview/overview-panel";
import { ProfilePanel } from "@/features/profile/profile-panel";
import { RecommendationsPanel } from "@/features/recommendations/recommendations-panel";
import { TimelinePanel } from "@/features/timeline/timeline-panel";
import { useWorkspace } from "@/features/workspace/use-workspace";

// ─── Workspace (authenticated shell) ─────────────────────────────────────────

export function WorkspacePage({ userId: uid }: { userId: string }) {
  const ws = useWorkspace(uid);
  const { workspaceQuery, location, items, lists, categories, activeList, go } = ws;

  // ── Loading / Error states ───────────────────────────────────────────────

  if (workspaceQuery.isLoading) {
    return (
      <div className="ninho-app" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingSpinner />
      </div>
    );
  }

  // Toda conta tem pelo menos uma lista (a API cria ou migra no primeiro acesso).
  if (workspaceQuery.isError || !workspaceQuery.data || !activeList) {
    return (
      <div className="ninho-app" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ErrorState message="Não foi possível carregar seus dados. Verifique sua conexão." onRetry={() => workspaceQuery.refetch()} />
      </div>
    );
  }

  const { profile, milestones: miles } = workspaceQuery.data;

  // ── Onboarding ──────────────────────────────────────────────────────────

  if (!profile.onboardingComplete) {
    return (
      <div className="ninho-app">
        <OnboardingModal userId={uid} onComplete={ws.handleOnboardingComplete} />
      </div>
    );
  }

  // ── Panel content ────────────────────────────────────────────────────────

  const categoriesOfList = (listId: number | undefined) => categories.filter((category) => category.listId === listId);

  const overviewPanel = (
    <OverviewPanel items={items} lists={lists} categories={categories} profile={profile} milestones={miles}
      setLocation={go}
    />
  );
  const checklistPanel = (
    <ChecklistPanel
      key={activeList.id}
      lists={lists}
      list={activeList}
      categories={categories.filter((category) => category.listId === activeList.id)}
      items={items.filter((item) => item.listId === activeList.id)}
      actions={ws.checklistActions}
      onSelectList={ws.selectList}
      onToggle={ws.handleToggle}
      onAdd={ws.openAdd}
      onEdit={ws.setEditingItem}
      onDelete={ws.handleDelete}
      onOpenRecommendation={ws.handleOpenRecommendation}
      onUnlinkRecommendation={ws.handleUnlinkRecommendation}
      onReleaseGiftReservation={ws.handleReleaseGiftReservation}
      onUpdateGiftReservation={ws.handleUpdateGiftReservation}
      pendingItemId={ws.pendingItemId}
      isActionPending={ws.isAddPending}
    />
  );
  const milestonePanel = (
    <TimelinePanel milestones={miles} profile={profile} onToggle={ws.handleMilestoneToggle} isActionPending={ws.isMilestonePending} />
  );
  const budgetPanel = (
    <BudgetPanel
      key={categories.map((c) => `${c.id}:${c.name}:${c.planned}`).join("|")}
      items={items}
      lists={lists}
      categories={categories}
      onSave={ws.handleBudgetSave}
      onEdit={ws.handleBudgetEdit}
      saveState={ws.budgetSaveState}
    />
  );
  const profilePanel = (
    <ProfilePanel
      key={profile.updatedAt}
      profile={profile}
      onSave={ws.handleProfileSave}
      saveState={ws.profileSaveState}
      saveError={ws.profileSaveError}
      share={ws.shareQuery.data}
      onCreateShare={ws.handleCreateShare}
      onRevokeShare={ws.handleRevokeShare}
      shareLoading={ws.shareLoading}
      shareError={ws.shareError}
      sharedListName={lists.length > 1 ? lists[0]!.name : null}
    />
  );
  const recommendationsPanel = (
    <RecommendationsPanel
      items={items}
      onAddRecommendation={ws.handleAddRecommendation}
      onLinkRecommendation={ws.handleLinkRecommendation}
      onOpenLinkedItem={(_item) => go("/checklist")}
      isActionPending={ws.isRecommendationActionPending}
      feedback={ws.recommendationFeedback}
      focusId={ws.recommendationFocusId}
    />
  );

  const isGiftRoute = location === "/gifts" || location.startsWith("/gifts/");
  const giftListId = Number(location.match(/^\/gifts\/(\d+)$/)?.[1] ?? 0);
  const giftPanel = giftListId
    ? <GiftListDetail key={giftListId} userId={uid} listId={giftListId} go={go} />
    : <GiftListsPanel userId={uid} go={go} />;
  const LIST_TAB_PATHS: Record<ListTab, string> = { itens: "/checklist", presentes: "/gifts", inspiracoes: "/recommendations" };
  const isListRoute = location === "/checklist" || location === "/recommendations" || isGiftRoute;
  const content = isListRoute ? (
    <ListScreen
      tab={isGiftRoute ? "presentes" : location === "/recommendations" ? "inspiracoes" : "itens"}
      onTab={(tab) => go(LIST_TAB_PATHS[tab])}
    >
      {isGiftRoute ? giftPanel : location === "/recommendations" ? recommendationsPanel : checklistPanel}
    </ListScreen>
  )
    : location === "/milestones" ? milestonePanel
    : location === "/budget" ? budgetPanel
    : location === "/profile" ? profilePanel
    : overviewPanel;

  return (
    <div className="ninho-app">
      <AppShell location={location} go={go} profile={profile}>
        {content}
      </AppShell>
      {ws.addOpen && ws.addCategoryId !== null && (
        <AddItemModal
          onClose={ws.closeAdd}
          onAdd={ws.handleAddItem}
          categoryId={ws.addCategoryId}
          categories={categoriesOfList(categories.find((category) => category.id === ws.addCategoryId)?.listId)}
          returnFocusTestId={ws.addTrigger ?? undefined}
        />
      )}
      {ws.editingItem && (
        <EditItemModal
          item={ws.editingItem}
          categories={categoriesOfList(ws.editingItem.listId)}
          onClose={() => ws.setEditingItem(null)}
          onSave={ws.handleEditItem}
        />
      )}
      <ActionFeedbackBanner feedback={ws.actionFeedback} onDismiss={ws.dismissActionFeedback} />
    </div>
  );
}

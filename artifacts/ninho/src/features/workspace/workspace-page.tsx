import { ActionFeedbackBanner } from "@/components/action-feedback";
import { ErrorState, LoadingSpinner } from "@/components/states";
import { AppShell, ListScreen } from "@/layout/app-shell";
import { BudgetPanel } from "@/features/budget/budget-panel";
import { ChecklistPanel } from "@/features/checklist/checklist-panel";
import { AddItemModal, EditItemModal } from "@/features/checklist/item-modals";
import { OnboardingModal } from "@/features/onboarding/onboarding-modal";
import { OverviewPanel } from "@/features/overview/overview-panel";
import { ProfilePanel } from "@/features/profile/profile-panel";
import { RecommendationsPanel } from "@/features/recommendations/recommendations-panel";
import { TimelinePanel } from "@/features/timeline/timeline-panel";
import { useWorkspace } from "@/features/workspace/use-workspace";

// ─── Workspace (authenticated shell) ─────────────────────────────────────────

export function WorkspacePage({ userId: uid }: { userId: string }) {
  const ws = useWorkspace(uid);
  const { workspaceQuery, location, items, go } = ws;

  // ── Loading / Error states ───────────────────────────────────────────────

  if (workspaceQuery.isLoading) {
    return (
      <div className="ninho-app" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (workspaceQuery.isError || !workspaceQuery.data) {
    return (
      <div className="ninho-app" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ErrorState message="Não foi possível carregar seus dados. Verifique sua conexão." onRetry={() => workspaceQuery.refetch()} />
      </div>
    );
  }

  const { profile, milestones: miles, budget } = workspaceQuery.data;

  // ── Onboarding ──────────────────────────────────────────────────────────

  if (!profile.onboardingComplete) {
    return (
      <div className="ninho-app">
        <OnboardingModal userId={uid} onComplete={ws.handleOnboardingComplete} />
      </div>
    );
  }

  // ── Panel content ────────────────────────────────────────────────────────

  const overviewPanel = (
    <OverviewPanel items={items} profile={profile} milestones={miles} budget={budget}
      setLocation={go}
    />
  );
  const checklistPanel = (
    <ChecklistPanel
      items={items}
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
      key={budget.map((b) => `${b.category}:${b.planned}`).join("|")}
      items={items}
      budget={budget}
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

  const isListRoute = location === "/checklist" || location === "/recommendations";
  const content = isListRoute ? (
    <ListScreen
      tab={location === "/recommendations" ? "inspiracoes" : "itens"}
      onTab={(tab) => go(tab === "itens" ? "/checklist" : "/recommendations")}
    >
      {location === "/recommendations" ? recommendationsPanel : checklistPanel}
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
      {ws.addOpen && <AddItemModal onClose={ws.closeAdd} onAdd={ws.handleAddItem} category={ws.addCategory} returnFocusTestId={ws.addTrigger ?? undefined} />}
      {ws.editingItem && <EditItemModal item={ws.editingItem} onClose={() => ws.setEditingItem(null)} onSave={ws.handleEditItem} />}
      <ActionFeedbackBanner feedback={ws.actionFeedback} onDismiss={ws.dismissActionFeedback} />
    </div>
  );
}

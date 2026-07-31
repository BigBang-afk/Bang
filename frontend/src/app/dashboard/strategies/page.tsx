"use client";

import { usePreferencesStore } from "@/store/preferences";
import { StrategySelector } from "@/components/signals/StrategySelector";
import { Card, CardTitle } from "@/components/ui/card";

export default function StrategiesPage(): React.ReactElement {
  const { selectedStrategyCode, aiAutoEnabled, setSelectedStrategy, setAiAutoEnabled } = usePreferencesStore();

  return (
    <Card>
      <CardTitle>Strategies</CardTitle>
      <StrategySelector
        selectedCode={selectedStrategyCode}
        aiAutoEnabled={aiAutoEnabled}
        onSelectStrategy={setSelectedStrategy}
        onToggleAiAuto={setAiAutoEnabled}
      />
    </Card>
  );
}

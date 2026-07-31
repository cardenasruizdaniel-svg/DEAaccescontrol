import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import { useTheme } from "../../theme/ThemeContext";
import OfflineBanner from "../../components/OfflineBanner";
import api from "../../services/api";
import { PayrollPeriod, PayrollRecord } from "../../types";

export default function PayrollScreen({ navigation }: any) {
  const { employeeId, companyId } = useAuthStore();
  const { theme } = useTheme();
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [latestRecord, setLatestRecord] = useState<PayrollRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const res = await api.get("/mobile/me/payroll-summary");
      setPeriods(res.data.periods || []);
      if (res.data.latest_record) {
        setLatestRecord(res.data.latest_record);
      }
    } catch {
      try {
        const periodRes = await api.get("/payroll/periods", { params: { company_id: companyId, page_size: 6 } });
        setPeriods(periodRes.data.items || []);

        const allPeriods = periodRes.data.items || [];
        for (const p of allPeriods) {
          try {
            const recRes = await api.get(`/payroll/periods/${p.id}/records`);
            const myRecord = recRes.data.items?.find((r: PayrollRecord) => r.employee_id === employeeId);
            if (myRecord) {
              setLatestRecord(myRecord);
              break;
            }
          } catch {}
        }
      } catch {}
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [companyId, employeeId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const s = styles(theme);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
      <View style={s.header}>
        <Text style={s.title}>Mi Nómina</Text>
      </View>

      <OfflineBanner />

      {latestRecord && (
        <View style={[s.summaryCard, { backgroundColor: theme.colors.primary }]}>
          <Text style={s.summaryLabel}>Neto a Pagar</Text>
          <Text style={s.summaryValue}>${formatCurrency(latestRecord.net_pay)}</Text>
          {latestRecord.worked_days > 0 && (
            <Text style={s.summaryDays}>{latestRecord.worked_days} días trabajados</Text>
          )}
          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <Text style={s.summaryItemLabel}>Devengado</Text>
              <Text style={s.summaryItemValue}>${formatCurrency(latestRecord.total_earnings)}</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={s.summaryItemLabel}>Deducciones</Text>
              <Text style={s.summaryItemValue}>${formatCurrency(latestRecord.total_deductions)}</Text>
            </View>
          </View>
        </View>
      )}

      {latestRecord && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Detalle Período Actual</Text>
          <View style={[s.detailCard, { backgroundColor: theme.colors.surface }]}>
            <DetailRow theme={theme} icon="cash" label="Salario base" value={`$${formatCurrency(latestRecord.base_salary)}`} />
            <DetailRow theme={theme} icon="bus" label="Aux. Transporte" value={`$${formatCurrency(latestRecord.transportation_assistance)}`} />
            <DetailRow theme={theme} icon="time" label="Horas extra" value={`${latestRecord.overtime_hours}h — $${formatCurrency(latestRecord.overtime_value)}`} />
            <DetailRow theme={theme} icon="moon" label="Recargo nocturno" value={`${latestRecord.night_hours}h — $${formatCurrency(latestRecord.night_value)}`} />
            <DetailRow theme={theme} icon="gift" label="Bonificaciones" value={`$${formatCurrency(latestRecord.bonuses)}`} />
            <DetailRow theme={theme} icon="heart" label="Salud" value={`-$${formatCurrency(latestRecord.health_deduction)}`} deduction />
            <DetailRow theme={theme} icon="shield" label="Pensión" value={`-$${formatCurrency(latestRecord.pension_deduction)}`} deduction />
            <DetailRow theme={theme} icon="finger-print" label="Retefuente" value={`-$${formatCurrency(latestRecord.retefuente)}`} deduction />
            <View style={[s.detailTotal, { borderTopColor: theme.colors.border }]}>
              <Text style={[s.detailTotalLabel, { color: theme.colors.text }]}>Total Devengado</Text>
              <Text style={[s.detailTotalValue, { color: theme.colors.success }]}>${formatCurrency(latestRecord.total_earnings)}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Períodos Anteriores</Text>
        {periods.length === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="document-text-outline" size={32} color={theme.colors.textMuted} />
            <Text style={[s.emptyText, { color: theme.colors.textMuted }]}>No hay períodos disponibles</Text>
          </View>
        ) : (
          periods.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[s.periodCard, { backgroundColor: theme.colors.surface }]}
              onPress={() => navigation.navigate("PayrollDetail", { period: p, employeeId })}
              activeOpacity={0.7}
            >
              <View style={s.periodInfo}>
                <Text style={[s.periodName, { color: theme.colors.text }]}>{p.name}</Text>
                <Text style={[s.periodDate, { color: theme.colors.textSecondary }]}>
                  {p.start_date} — {p.end_date}
                </Text>
              </View>
              <View style={[s.periodBadge, { backgroundColor: p.is_closed ? theme.colors.success + "18" : theme.colors.warning + "18" }]}>
                <Text style={[s.periodBadgeText, { color: p.is_closed ? theme.colors.success : theme.colors.warning }]}>
                  {p.is_closed ? "Cerrado" : "Abierto"}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function DetailRow({ theme, icon, label, value, deduction }: any) {
  return (
    <View style={[drStyles.row, { borderBottomColor: theme.colors.borderLight }]}>
      <Ionicons name={icon} size={16} color={deduction ? theme.colors.danger : theme.colors.textMuted} />
      <Text style={[drStyles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[drStyles.value, { color: deduction ? theme.colors.danger : theme.colors.text }]}>{value}</Text>
    </View>
  );
}

const drStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  label: { flex: 1, fontSize: 14 },
  value: { fontSize: 14, fontWeight: "600" },
});

function formatCurrency(v: number) {
  return new Intl.NumberFormat("es-CO").format(Math.round(v || 0));
}

function styles(t: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    content: { paddingBottom: 40 },
    header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
    title: { fontSize: 24, fontWeight: "bold", color: t.colors.text },
    summaryCard: { marginHorizontal: 20, borderRadius: 16, padding: 24, marginBottom: 20 },
    summaryLabel: { fontSize: 13, color: "rgba(255,255,255,0.8)" },
    summaryValue: { fontSize: 32, fontWeight: "bold", color: "#fff", marginVertical: 4 },
    summaryDays: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 4 },
    summaryRow: { flexDirection: "row", marginTop: 12 },
    summaryItem: { flex: 1 },
    summaryItemLabel: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
    summaryItemValue: { fontSize: 15, fontWeight: "600", color: "#fff", marginTop: 2 },
    summaryDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.3)", marginHorizontal: 16 },
    section: { paddingHorizontal: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 17, fontWeight: "bold", marginBottom: 12 },
    detailCard: { borderRadius: 14, padding: 16 },
    detailTotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
    detailTotalLabel: { fontSize: 15, fontWeight: "600" },
    detailTotalValue: { fontSize: 17, fontWeight: "bold" },
    emptyCard: { borderRadius: 14, padding: 32, alignItems: "center" },
    emptyText: { fontSize: 14, marginTop: 8 },
    periodCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 16, marginBottom: 10 },
    periodInfo: { flex: 1 },
    periodName: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
    periodDate: { fontSize: 13 },
    periodBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
    periodBadgeText: { fontSize: 12, fontWeight: "600" },
  });
}

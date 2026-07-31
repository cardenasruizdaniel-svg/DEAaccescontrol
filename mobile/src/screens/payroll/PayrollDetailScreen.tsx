import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../hooks/useToast";
import OfflineBanner from "../../components/OfflineBanner";
import api from "../../services/api";
import { PayrollRecord } from "../../types";

export default function PayrollDetailScreen({ route, navigation }: any) {
  const { period, employeeId } = route.params;
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [record, setRecord] = useState<PayrollRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await api.get(`/mobile/me/payroll-summary`);
      const latest = res.data.latest_record;
      if (latest && latest.period_id === period.id) {
        setRecord(latest);
        setLoading(false);
        return;
      }
    } catch {}
    try {
      const res = await api.get(`/payroll/periods/${period.id}/records`);
      const myRecord = res.data.items?.find((r: PayrollRecord) => r.employee_id === employeeId);
      setRecord(myRecord || null);
    } catch {}
    setLoading(false);
  }, [period.id, employeeId]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const s = styles(theme);

  if (loading) {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={s.title}>{period.name}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ alignItems: "center", paddingTop: 40 }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
    >
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>{period.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <OfflineBanner />

      {record ? (
        <>
          <View style={[s.netCard, { backgroundColor: theme.colors.primary }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <View style={[s.statusBadge, { backgroundColor: record.status === "paid" ? theme.colors.success + "30" : record.status === "calculated" ? theme.colors.info + "30" : theme.colors.warning + "30" }]}>
                <Text style={[s.statusText, { color: record.status === "paid" ? theme.colors.success : record.status === "calculated" ? theme.colors.info : theme.colors.warning }]}>
                  {record.status === "paid" ? "Pagado" : record.status === "calculated" ? "Calculado" : "Pendiente"}
                </Text>
              </View>
              {record.worked_days > 0 && (
                <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{record.worked_days} días</Text>
              )}
            </View>
            <Text style={s.netLabel}>Neto a Pagar</Text>
            <Text style={s.netValue}>${fmt(record.net_pay)}</Text>
            <Text style={s.netSub}>Pago estimado: {period.payment_date}</Text>
          </View>

          <Section title="Devengados" theme={theme}>
            <Row label="Salario base" value={`$${fmt(record.base_salary)}`} theme={theme} />
            <Row label="Aux. transporte" value={`$${fmt(record.transportation_assistance)}`} theme={theme} />
            {record.overtime_hours > 0 && <Row label={`Horas extra (${record.overtime_hours}h)`} value={`$${fmt(record.overtime_value)}`} theme={theme} />}
            {record.night_hours > 0 && <Row label={`Recargo nocturno (${record.night_hours}h)`} value={`$${fmt(record.night_value)}`} theme={theme} />}
            {record.sunday_holiday_hours > 0 && <Row label={`Domingo/festivos (${record.sunday_holiday_hours}h)`} value={`$${fmt(record.sunday_holiday_value)}`} theme={theme} />}
            {record.bonuses > 0 && <Row label="Bonificaciones" value={`$${fmt(record.bonuses)}`} theme={theme} />}
            {record.commissions > 0 && <Row label="Comisiones" value={`$${fmt(record.commissions)}`} theme={theme} />}
            <Row label="Total devengado" value={`$${fmt(record.total_earnings)}`} bold theme={theme} />
          </Section>

          <Section title="Deducciones" theme={theme}>
            <Row label="Salud" value={`-$${fmt(record.health_deduction)}`} negative theme={theme} />
            <Row label="Pensión" value={`-$${fmt(record.pension_deduction)}`} negative theme={theme} />
            {record.solidarity_fund > 0 && <Row label="Fondo solidaridad" value={`-$${fmt(record.solidarity_fund)}`} negative theme={theme} />}
            {record.retefuente > 0 && <Row label="Retefuente" value={`-$${fmt(record.retefuente)}`} negative theme={theme} />}
            <Row label="Total deducciones" value={`-$${fmt(record.total_deductions)}`} bold negative theme={theme} />
          </Section>

          <Section title="Aportes Empleador" theme={theme}>
            <Row label="Salud empleador" value={`$${fmt(record.health_employer)}`} theme={theme} />
            <Row label="Pensión empleador" value={`$${fmt(record.pension_employer)}`} theme={theme} />
            <Row label="ARL" value={`$${fmt(record.arl_employer)}`} theme={theme} />
            <Row label="ICBF" value={`$${fmt(record.icbf)}`} theme={theme} />
            <Row label="SENA" value={`$${fmt(record.sena)}`} theme={theme} />
            <Row label="Caja compensación" value={`$${fmt(record.caja_compensacion_employer)}`} theme={theme} />
            <Row label="Cesantías" value={`$${fmt(record.cesantias)}`} theme={theme} />
            <Row label="Prima servicios" value={`$${fmt(record.prima_servicios)}`} theme={theme} />
            <Row label="Total costo empleador" value={`$${fmt(record.total_employer_cost)}`} bold theme={theme} />
          </Section>
        </>
      ) : (
        <View style={s.emptyContainer}>
          <Ionicons name="document-text-outline" size={40} color={theme.colors.textMuted} />
          <Text style={[s.emptyText, { color: theme.colors.textMuted }]}>No hay liquidación registrada para este período</Text>
        </View>
      )}
    </ScrollView>
  );
}

function Section({ title, children, theme }: any) {
  return (
    <View style={[secStyles.card, { backgroundColor: theme.colors.surface }]}>
      <Text style={[secStyles.title, { color: theme.colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

const secStyles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, marginBottom: 16, marginHorizontal: 20 },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 12 },
});

function Row({ label, value, bold, negative, theme }: any) {
  return (
    <View style={[rowStyles.row, { borderBottomColor: theme.colors.borderLight }]}>
      <Text style={[rowStyles.label, { color: theme.colors.textSecondary, fontWeight: bold ? "600" : "400" }]}>{label}</Text>
      <Text style={[rowStyles.value, { color: negative ? theme.colors.danger : theme.colors.text, fontWeight: bold ? "700" : "500" }]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1 },
  label: { fontSize: 14, flex: 1 },
  value: { fontSize: 14, textAlign: "right" },
});

function fmt(v: number) {
  return new Intl.NumberFormat("es-CO").format(Math.round(v || 0));
}

function styles(t: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    content: { paddingBottom: 40 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    title: { fontSize: 18, fontWeight: "bold", color: t.colors.text },
    netCard: { marginHorizontal: 20, borderRadius: 16, padding: 24, marginBottom: 20 },
    netLabel: { fontSize: 13, color: "rgba(255,255,255,0.8)" },
    netValue: { fontSize: 32, fontWeight: "bold", color: "#fff", marginVertical: 4 },
    netSub: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: "600" },
    emptyContainer: { alignItems: "center", paddingTop: 60 },
    emptyText: { fontSize: 14, marginTop: 12 },
  });
}

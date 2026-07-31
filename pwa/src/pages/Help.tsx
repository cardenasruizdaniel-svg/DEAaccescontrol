import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { helpApi } from "@/api/endpoints";
import {
  HelpCircle, ChevronDown, ChevronUp, MessageCircle, Bug,
  Mail, FileText, CheckCircle
} from "lucide-react";

const faqs = [
  { q: "¿Cómo inicio mi turno?", a: "Ve a 'Turno' en la barra inferior, presiona 'Iniciar Turno', toma tu fotografía para verificación biométrica, espera la validación GPS y confirma." },
  { q: "¿Qué hago si no tengo conexión?", a: "La app funciona offline. Registra entradas, salidas y fotos. Todo se sincronizará automáticamente al recuperar conexión." },
  { q: "¿Cómo cambio mi contraseña?", a: "Ve a 'Perfil' → 'Cambiar Contraseña'. Ingresa tu contraseña actual y la nueva." },
  { q: "¿Dónde veo mi nómina?", a: "En la barra inferior selecciona 'Nómina'. Ahí verás la nómina abierta y el historial de pagos." },
  { q: "¿Cómo descargo un comprobante?", a: "En 'Nómina' → 'Historial', presiona el icono de descarga junto al período deseado." },
  { q: "¿La app funciona en iPhone?", a: "Sí. Instálala desde Safari: abre la página, presiona 'Compartir' y selecciona 'Agregar a Pantalla de Inicio'." },
  { q: "¿Cómo actualizo mis datos?", a: "En 'Perfil' puedes ver tu información. Los cambios requieren aprobación administrativa." },
];

export function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!subject || !message) { setError("Todos los campos son requeridos"); return; }
    setSending(true);
    try {
      await helpApi.reportIssue({ subject, message });
      setSent(true);
      setSubject("");
      setMessage("");
      setTimeout(() => setSent(false), 4000);
    } catch { setError("Error al enviar el reporte"); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Ayuda</h1>
      </div>

      <Card>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" /> Preguntas Frecuentes
        </h3>
        <div className="space-y-1">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-border last:border-0 pb-2 last:pb-0">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between py-2 text-sm text-left"
              >
                <span className="font-medium flex-1">{faq.q}</span>
                {openFaq === i ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
              </button>
              {openFaq === i && <p className="text-xs text-text-secondary pb-2">{faq.a}</p>}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Bug className="h-4 w-4 text-warning" /> Reportar Incidencia
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Asunto del reporte"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea
            placeholder="Describe el problema en detalle..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full rounded-xl border-2 border-border bg-surface p-3 text-sm resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          {sent && (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle className="h-4 w-4" /> Reporte enviado correctamente
            </div>
          )}
          <Button type="submit" loading={sending}>Enviar Reporte</Button>
        </form>
      </Card>

      <Card>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" /> Contacto de Soporte
        </h3>
        <p className="text-sm text-text-secondary">Email: soporte@dlaredes.com.co</p>
        <p className="text-sm text-text-secondary">Tel: +57 300 000 0000</p>
        <p className="text-sm text-text-secondary">Horario: Lun - Vie, 7:00 AM - 6:00 PM</p>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Información de la App</h3>
        </div>
        <div className="space-y-1 text-xs text-text-secondary">
          <p>Versión: 1.0.0</p>
          <p>Build: {import.meta.env.MODE}</p>
          <p>DLA Redes y Seguridad &copy; 2026</p>
        </div>
      </Card>
    </div>
  );
}

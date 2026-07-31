"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HelpCircle, BookOpen, MessageCircle, Bug, ChevronDown, ChevronUp, Mail, FileText, Shield } from "lucide-react";

const faqs = [
  { q: "¿Cómo inicio mi turno?", a: "Vaya a 'Turno' en la barra inferior, seleccione la visita programada, complete la verificación biométrica y GPS, y pulse 'Iniciar Turno'." },
  { q: "¿Qué hago si no tengo conexión a Internet?", a: "La aplicación funciona offline. Registre entradas, salidas y fotografías. Todo se sincronizará automáticamente cuando recupere conexión." },
  { q: "¿Cómo cambio mi contraseña?", a: "Vaya a 'Perfil' → 'Cambiar Contraseña'. Ingrese su contraseña actual y la nueva." },
  { q: "¿Dónde veo mi nómina?", a: "En la barra inferior, seleccione 'Nómina'. Allí verá la nómina abierta y el historial de pagos." },
  { q: "¿Cómo descargo un comprobante de pago?", a: "En 'Nómina' → 'Historial', pulse el botón 'Comprobante' junto al período deseado." },
  { q: "¿La aplicación funciona en iPhone?", a: "Sí. Instálela desde Safari: abra la página, pulse el botón Compartir y seleccione 'Agregar a Pantalla de Inicio'." },
  { q: "¿Actualización de datos personales?", a: "En 'Perfil' puede actualizar su información autorizada. Los cambios requieren aprobación administrativa." },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({ subject: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setForm({ subject: "", message: "" });
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Ayuda y Soporte</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" />Manual del Usuario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">Guía completa de uso de la aplicación</p>
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => window.open("/docs/manual-usuario.pdf", "_blank")}>
              <FileText className="h-3 w-3" />Descargar Manual
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />Contacto Soporte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">Comuníquese con el equipo de soporte</p>
            <a href="mailto:soporte@dlaredes.com.co" className="flex items-center gap-2 text-sm text-primary hover:underline">
              <Mail className="h-3 w-3" />soporte@dlaredes.com.co
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />Versión
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            <p>Aplicación: DLA Access Enterprise</p>
            <p>Versión: 1.0.0</p>
            <p>Build: {process.env.NEXT_PUBLIC_BUILD_ID || "development"}</p>
            <p>© {new Date().getFullYear()} DLA Redes y Seguridad</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bug className="h-4 w-4" />Reportar Incidencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sent ? (
              <p className="text-sm text-success text-center py-2">Reporte enviado correctamente</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-2">
                <Input placeholder="Asunto" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required className="text-xs" />
                <Textarea placeholder="Describa el problema..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required className="text-xs" rows={3} />
                <Button type="submit" size="sm" className="w-full">Enviar Reporte</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />Preguntas Frecuentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {faqs.map((faq, i) => (
            <div key={i} className="border rounded-lg overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-3 text-sm text-left hover:bg-muted/50 transition-colors">
                <span className="font-medium">{faq.q}</span>
                {openFaq === i ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {openFaq === i && (
                <div className="px-3 pb-3 text-sm text-muted-foreground border-t pt-2">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Shield, Eye, UserCheck } from "lucide-react";

export default function FacialRecognitionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reconocimiento Facial</h1>
        <p className="text-muted-foreground">Motor biom\u00e9trico con detecci\u00f3n de vida y control anti fraude</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-6 text-center">
          <Camera className="h-12 w-12 mx-auto text-blue-600 mb-3" />
          <h3 className="font-semibold">Face Recognition</h3>
          <p className="text-sm text-muted-foreground mt-1">Comparaci\u00f3n biom\u00e9trica facial con encoding 128D</p>
        </CardContent></Card>
        <Card><CardContent className="p-6 text-center">
          <Eye className="h-12 w-12 mx-auto text-green-600 mb-3" />
          <h3 className="font-semibold">Liveness Detection</h3>
          <p className="text-sm text-muted-foreground mt-1">Detecci\u00f3n de vida para evitar fraude con fotos/videos</p>
        </CardContent></Card>
        <Card><CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 mx-auto text-red-600 mb-3" />
          <h3 className="font-semibold">Anti-Fraude</h3>
          <p className="text-sm text-muted-foreground mt-1">Protecci\u00f3n contra GPS falso y manipulaci\u00f3n de im\u00e1genes</p>
        </CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Registrar Rostro</CardTitle><CardDescription>Capture una fotograf\u00eda del empleado para registro biom\u00e9trico</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="w-64 h-64 rounded-xl bg-muted border-2 border-dashed flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Capturar foto</p>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <p className="text-sm text-muted-foreground">Seleccione un empleado y capture su fotograf\u00eda frontal para el registro biom\u00e9trico. El sistema extraer\u00e1 el encoding facial (128 dimensiones) y lo almacenar\u00e1 de forma segura.</p>
              <div className="space-y-2"><label className="text-sm font-medium">Empleado</label><input className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Buscar empleado..." /></div>
              <Button><UserCheck className="mr-2 h-4 w-4" />Registrar Rostro</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

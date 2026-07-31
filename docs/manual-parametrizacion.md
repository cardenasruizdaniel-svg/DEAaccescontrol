# Manual de Parametrizacion - DLA Access Enterprise

## 1. Flujo de Parametrizacion

Siga este orden para configurar el sistema por primera vez:

```
1. Empresa → 2. Departamentos → 3. Centros de Costo → 4. Cargos
→ 5. Equipos → 6. Roles/Permisos → 7. Usuarios → 8. Clientes
→ 9. Contratos de Tipos → 10. Nomina → 11. Plantillas Turno
```

---

## 2. Datos de la Empresa

### 2.1 Empresa Principal

La empresa se crea al inicializar el sistema. Verifique los datos en la base de datos:

```sql
SELECT id, nit, business_name, email, phone
FROM companies WHERE is_deleted = false;
```

Si necesita actualizar datos:
```sql
UPDATE companies
SET phone = '3001234567',
    email = 'admin@dlaredes.com.co',
    address = 'Calle 100 #15-20, Bogota'
WHERE id = '6bba0cbb-3349-43fb-9686-ed0197b5164f';
```

### 2.2 Sucursales

Si la empresa tiene multiples sedes, cree sucursales:
```sql
INSERT INTO branches (id, company_id, name, address, city, phone, is_active, created_at, updated_at, is_deleted)
VALUES (gen_random_uuid()::varchar(36), '6bba0cbb-...', 'Sede Norte', 'Cra 7 #45-67', 'Bogota', '3009876543', true, now(), now(), false);
```

---

## 3. Estructura Organizacional

### 3.1 Departamentos

Crear departamentos desde la API:

```bash
# Crear departamento de Seguridad
curl -X POST http://localhost:8888/api/v1/employees/departments \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Seguridad Privada",
    "description": "Departamento de operaciones de seguridad",
    "cost_center": "SEG-001"
  }'
```

**Estructura recomendada de departamentos:**

```
Direccion General
├── Gerencia
├── Administracion
├── Operaciones
│   ├── Seguridad Privada
│   ├── Vigilancia
│   └── Escolta
├── RRHH
├── Finanzas
└── Tecnologia
```

### 3.2 Centros de Costo

```bash
curl -X POST http://localhost:8888/api/v1/employees/cost-centers \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Operaciones Seguridad",
    "code": "SEG-OPS-001",
    "budget": 50000000
  }'
```

### 3.3 Cargos

Crear cargos asociados a departamentos:

| Cargo | Departamento | Salario Min (SMMLV) | Salario Max (SMMLV) |
|-------|-------------|---------------------|---------------------|
| Director de Operaciones | Direccion | 8 | 15 |
| Gerente de Seguridad | Gerencia | 6 | 10 |
| Supervisor | Operaciones | 3 | 5 |
| Vigilante | Seguridad Privada | 1.5 | 2.5 |
| Cuidador | Seguridad Privada | 1.2 | 2 |
| Escolta | Operaciones | 2 | 4 |
| Analista | Administracion | 2 | 4 |
| Tecnico | Tecnologia | 2 | 3.5 |

### 3.4 Equipos de Trabajo

```bash
curl -X POST http://localhost:8888/api/v1/employees/work-teams \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cuadrante Norte",
    "description": "Equipo de vigilancia zona norte de Bogota",
    "leader_id": "2ebad903-edf5-447a-898f-c4e6fd94f49a"
  }'
```

---

## 4. Roles y Permisos

### 4.1 Verificar Roles Existentes

```bash
curl http://localhost:8888/api/v1/iam/roles \
  -H "Authorization: Bearer TOKEN"
```

Los 9 roles predeterminados ya estan configurados:
1. **Super Admin** (nivel 1) - Acceso total
2. **Gerencia** (nivel 2) - Vision general
3. **Administracion** (nivel 3) - Gestion operativa
4. **Auditor** (nivel 4) - Solo lectura
5. **Supervisor** (nivel 5) - Supervision
6. **Administrativo** (nivel 6) - Tareas admin
7. **Medico** (nivel 7) - Informacion medica
8. **Enfermero** (nivel 8) - Atencion basica
9. **Cuidador** (nivel 9) - Acceso basico movil

### 4.2 Crear Rol Personalizado

```bash
curl -X POST http://localhost:8888/api/v1/iam/roles \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "vigilante_nocturno",
    "display_name": "Vigilante Nocturno",
    "description": "Vigilante con acceso movil nocturno",
    "level": 8,
    "color": "#6366f1"
  }'
```

### 4.3 Asignar Permisos a un Rol

```bash
# Primero, obtener IDs de permisos disponibles
curl http://localhost:8888/api/v1/iam/permissions \
  -H "Authorization: Bearer TOKEN"

# Asignar permisos al rol
curl -X PUT http://localhost:8888/api/v1/iam/roles/{role_id}/permissions \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permission_ids": ["perm_id_1", "perm_id_2", ...]
  }'
```

---

## 5. Crear Empleados con Acceso

### 5.1 Crear Empleado

```bash
curl -X POST http://localhost:8888/api/v1/employees \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Carlos",
    "last_name": "Rodriguez",
    "document_type": "CC",
    "document_number": "1234567890",
    "email": "carlos.rodriguez@dlaredes.com.co",
    "phone": "3001234567",
    "department_id": "dept_id_aqui",
    "job_position_id": "job_id_aqui",
    "hire_date": "2025-01-15"
  }'
```

### 5.2 Crear Acceso al Sistema

```bash
curl -X POST http://localhost:8888/api/v1/employees/{employee_id}/access \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "carlos.rodriguez",
    "password": "temporal123",
    "role_id": "role_id_supervisor",
    "platform_access": "both",
    "force_password_change": true,
    "mfa_enabled": false
  }'
```

### 5.3 Configuracion de Acceso por Rol

| Rol | Plataforma | MFA | Forzar Cambio |
|-----|-----------|-----|---------------|
| Super Admin | Ambas | Si | No |
| Gerencia | Web | Opcional | Si |
| Supervisor | Ambas | No | Si |
| Cuidador | App | No | Si |
| Medico | Web | No | Si |

---

## 6. Clientes

### 6.1 Crear Cliente

```bash
curl -X POST http://localhost:8888/api/v1/clients \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Banco Nacional",
    "nit": "900123456-7",
    "type": "corporate",
    "email": "contacto@banco.com",
    "phone": "6013456789",
    "address": "Cra 7 #24-60, Bogota"
  }'
```

### 6.2 Agregar Contactos

```bash
curl -X POST http://localhost:8888/api/v1/clients/{client_id}/contacts \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maria Lopez",
    "position": "Gerente de Seguridad",
    "email": "mlopez@banco.com",
    "phone": "3009876543",
    "is_primary": true
  }'
```

### 6.3 Agregar Ubicaciones

```bash
curl -X POST http://localhost:8888/api/v1/clients/{client_id}/locations \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sede Principal",
    "address": "Cra 7 #24-60, Bogota",
    "latitude": 4.6097,
    "longitude": -74.0817,
    "geofence_radius": 100
  }'
```

---

## 7. Contratos

### 7.1 Crear Tipo de Contrato

```bash
curl -X POST http://localhost:8888/api/v1/contracts/types \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Termino Indefinido",
    "description": "Contrato a termino indefinido segun CST"
  }'
```

**Tipos recomendados:**
- Termino Indefinido
- Termino Fijo
- Obra o Labor
- Prestacion de Servicios

### 7.2 Crear Contrato

```bash
curl -X POST http://localhost:8888/api/v1/contracts \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "emp_id",
    "client_id": "client_id",
    "contract_type_id": "type_id",
    "start_date": "2025-01-15",
    "salary": 1800000,
    "position": "Vigilante"
  }'
```

---

## 8. Parametrizacion de Nomina

### 8.1 Conceptos de Nomina

Los conceptos se crean segun las necesidades de la empresa. Ejemplos:

#### Devengos

| Concepto | Codigo | Tipo | Valor |
|----------|--------|------|-------|
| Salario Base | SAL_BASE | fijo | Segun contrato |
| Auxilio Transporte | AUX_TRANS | fijo | $206.000/mes |
| Hora Extra Diurna | HE_DIA | variable | 1.25x valor hora |
| Hora Extra Nocturna | HE_NOCHE | variable | 1.75x valor hora |
| Recargo Nocturno | REC_NOCHE | variable | 35% del valor hora |
| Dominical/Festivo | DOM_FEST | variable | 75% del valor hora |
| Prima Servicios | PRI_SER | fijo | 8.33% del semestre |
| Cesantias | CESANT | fijo | 8.33% del año |

#### Deducciones

| Concepto | Codigo | Tipo | Valor |
|----------|--------|------|-------|
| Salud | D_SALUD | porcentaje | 4% |
| Pension | D_PENSION | porcentaje | 4% |
| Retencion Fuente | D_RET_FUENTE | variable | Segun tabla DIAN |
| Caja Compensacion | D_CAJA | porcentaje | 4% |

### 8.2 Periodo de Nomina

```bash
curl -X POST http://localhost:8888/api/v1/payroll/periods \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nomina Julio 2025",
    "start_date": "2025-07-01",
    "end_date": "2025-07-31",
    "type": "monthly"
  }'
```

### 8.3 Calcular Nomina

```bash
# Calcular para todos los empleados activos
curl -X POST http://localhost:8888/api/v1/payroll/periods/{period_id}/calculate \
  -H "Authorization: Bearer TOKEN"

# Calcular para un empleado especifico
curl -X POST http://localhost:8888/api/v1/payroll/calculate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "period_id": "period_id",
    "employee_id": "employee_id"
  }'
```

### 8.4 Cerrar Periodo

> **ADVERTENCIA:** Cerrar un periodo es irreversible. Verifique todos los registros antes de cerrar.

```bash
curl -X POST http://localhost:8888/api/v1/payroll/periods/{period_id}/close \
  -H "Authorization: Bearer TOKEN"
```

---

## 9. Plantillas de Turno

### 9.1 Crear Plantilla

```bash
curl -X POST http://localhost:8888/api/v1/scheduling/templates \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Turno Diurno",
    "start_time": "06:00",
    "end_time": "14:00",
    "description": "Turno de 8 horas diurno",
    "color": "#22c55e"
  }'
```

**Plantillas recomendadas:**

| Nombre | Horario | Color |
|--------|---------|-------|
| Turno Diurno | 06:00 - 14:00 | Verde |
| Turno Vespertino | 14:00 - 22:00 | Amarillo |
| Turno Nocturno | 22:00 - 06:00 | Rojo |
| Jornada Completa | 06:00 - 18:00 | Azul |

### 9.2 Crear Programacion

```bash
curl -X POST http://localhost:8888/api/v1/scheduling/schedules \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cuadrante Norte - Julio 2025",
    "start_date": "2025-07-01",
    "end_date": "2025-07-31",
    "description": "Programacion mensual zona norte"
  }'
```

### 9.3 Crear Turno Individual

```bash
curl -X POST http://localhost:8888/api/v1/scheduling/shifts \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schedule_id": "schedule_id",
    "employee_id": "employee_id",
    "template_id": "template_id",
    "date": "2025-07-01",
    "start_time": "06:00",
    "end_time": "14:00",
    "location": "Banco Nacional - Sede Principal"
  }'
```

### 9.4 Serie Recurrente

```bash
curl -X POST http://localhost:8888/api/v1/scheduling/series \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lunes a Viernes 6am-2pm",
    "employee_id": "employee_id",
    "template_id": "template_id",
    "start_date": "2025-07-01",
    "end_date": "2025-07-31",
    "recurrence_type": "weekly",
    "days_of_week": [1, 2, 3, 4, 5]
  }'
```

---

## 10. Notificaciones

### 10.1 Registrar Token Push (Movil)

```bash
curl -X POST http://localhost:8888/api/v1/notifications/register \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "expo_push_token_del_dispositivo",
    "platform": "mobile"
  }'
```

### 10.2 Tipos de Notificacion

| Tipo | Color Icono | Uso |
|------|-------------|-----|
| `shift` | Primario (azul) | Asignacion/cambio de turnos |
| `payroll` | Exito (verde) | Periodos de nomina disponibles |
| `system` | Info (gris) | Actualizaciones del sistema |
| `alert` | Advertencia (amarillo) | Alertas de seguridad |

---

## 11. Checklist de Parametrizacion

- [ ] Datos de empresa correctos
- [ ] Sucursales creadas (si aplica)
- [ ] Departamentos configurados
- [ ] Centros de costo definidos
- [ ] Cargos creados con rangos salariales
- [ ] Equipos de trabajo formados
- [ ] Roles y permisos verificados/creados
- [ ] Super Admin con acceso `both` y MFA
- [ ] Usuarios creados con roles apropiados
- [ ] Plantillas de turno configuradas
- [ ] Conceptos de nomina definidos
- [ ] Primer periodo de nomina creado
- [ ] Clientes registrados con contactos y ubicaciones
- [ ] Geocercas configuradas
- [ ] API keys configuradas (Google Maps, OpenAI)
- [ ] Contrasena de admin cambiada

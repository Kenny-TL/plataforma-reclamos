# Correcciones autorizadas tras la auditoría

Autorización del usuario: continuar todas las fases. Fecha de preparación: 06/11/2026.

`202611060001_security_workflows.sql` corrige H01/H02/H07 y protege parámetros compatibles con el contrato existente. Afecta lectura de auditoría, edición de perfiles, carga municipal y resultado de correo. No crea roles/estados ni recrea base.

Impacto: clientes antiguos que actualicen perfiles o suban directamente a Storage deberán usar la nueva RPC y Edge. El administrador conservará auditoría de configuración/personal, sin contenido de expedientes. La edición del perfil propio no podrá cambiar rol/área/activo; se preserva al último administrador. Riesgo principal: incompatibilidad con clientes antiguos; se actualiza el frontend de esta entrega a la vez.

No se modifican los scripts originales ni se usa db push. Las migraciones nuevas se aplicarán individualmente con transacción después de validarlas contra el esquema remoto. El historial de ejecución y las pruebas se registrarán en PHASE_REPORTS.md.

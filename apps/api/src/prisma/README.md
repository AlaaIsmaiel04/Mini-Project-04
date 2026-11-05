# Prisma integration

Global PrismaModule provides one injectable PrismaService. It connects on module initialization and disconnects during shutdown. AppModule imports it before feature modules. Schema, migration and seed live in `apps/api/prisma`; follow [local setup](../../../../docs/LOCAL-SETUP.md).

import { defaultFieldResolver, GraphQLSchema } from "graphql";
import { mapSchema, getDirective, MapperKind } from "@graphql-tools/utils";

export function authDirectiveTransformer(schema: GraphQLSchema): GraphQLSchema {
  return mapSchema(schema, {
    [MapperKind.OBJECT_TYPE]: (type) => {
      const directive = getDirective(schema, type, "auth")?.[0];
      if (!directive?.role) return type;

      const allowedRoles = directive.role
        .split(",")
        .map((r: string) => r.trim().toUpperCase());

      const fields = type.getFields();
      for (const fieldName in fields) {
        const field = fields[fieldName];

        // Skip if field already has its own @auth
        if (getDirective(schema, field, "auth")) continue;

        const originalResolve = field.resolve || defaultFieldResolver;

        field.resolve = async (parent, args, context, info) => {
          const userRole = context.user?.role?.toUpperCase();
          if (!userRole)
            throw new Error(`Access denied, Unauthorized user must be login'`);
          if (!userRole || !allowedRoles.includes(userRole)) {
            throw new Error(
              `Access denied for role '${userRole}' on '${type.name}.${fieldName}'`
            );
          }
          return originalResolve(parent, args, context, info);
        };
      }

      return type;
    },

    [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
      const directive = getDirective(schema, fieldConfig, "auth")?.[0];
      if (!directive?.role) return fieldConfig;

      const allowedRoles = directive.role
        .split(",")
        .map((r: string) => r.trim().toUpperCase());

      const originalResolve = fieldConfig.resolve || defaultFieldResolver;

      fieldConfig.resolve = async (parent, args, context, info) => {
        const userRole = context.user?.role?.toUpperCase();
        if (!userRole)
          throw new Error(`Access denied, Unauthorized user must be login'`);
        if (!userRole || !allowedRoles.includes(userRole)) {
          throw new Error(
            `Access denied for role '${userRole}' on field '${typeName}.${fieldName}'`
          );
        }
        return originalResolve(parent, args, context, info);
      };

      return fieldConfig;
    },
  });
}

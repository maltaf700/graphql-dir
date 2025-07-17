import { defaultFieldResolver, GraphQLSchema } from "graphql";
import { mapSchema, getDirective, MapperKind } from "@graphql-tools/utils";

const roleMap = new Map<string, string[]>();

export function authDirectiveTransformer(schema: GraphQLSchema): GraphQLSchema {
  return mapSchema(schema, {
    [MapperKind.OBJECT_TYPE]: (type) => {
      const directive = getDirective(schema, type, "auth")?.[0];
      if (directive?.role) {
        const roles = directive.role.split(",").map((r:string) => r.trim());
        roleMap.set(type.name, roles);
      }
      return type;
    },
    [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
      const directive = getDirective(schema, fieldConfig, "auth")?.[0];
      const originalResolve = fieldConfig.resolve || defaultFieldResolver;
      if (directive?.role) {
        const roles = directive.role.split(",").map((r:string) => r.trim());
        fieldConfig.resolve = async (parent, args, context, info) => {
          const userRole = context.user?.role;
          if (!userRole || !roles.includes(userRole.toUpperCase())) {
            throw new Error(
              `Access denied for role '${userRole}' on field/type '${typeName}.${fieldName}'`
            );
          }
          return originalResolve(parent, args, context, info);
        };
      } else if (roleMap.has(typeName)) {
        const roles = roleMap.get(typeName)!;
        fieldConfig.resolve = async (parent, args, context, info) => {
          const userRole = context.user?.role;
          if (!userRole || !roles.includes(userRole.toUpperCase())) {
            throw new Error(
              `Access denied for role '${userRole}' on field/type '${typeName}.${fieldName}'`
            );
          }
          return originalResolve(parent, args, context, info);
        };
      }
      return fieldConfig;
    },
  });
}

import { Column } from "../deps.ts";

export const String = (options?: { nullable?: boolean }) => {
  return Column({ type: "text", nullable: options?.nullable });
};

export const StringArray = (options?: { nullable?: boolean }) => {
  return Column({ type: "text", array: true, nullable: options?.nullable });
};

export const Int = (options?: { nullable?: boolean }) => {
  return Column({ type: "integer", nullable: options?.nullable });
};

export const IntArray = (options?: { nullable?: boolean }) => {
  return Column({ type: "integer", array: true, nullable: options?.nullable });
};

export const Float = (options?: { nullable?: boolean }) => {
  return Column({ type: "float", nullable: options?.nullable });
};

export const FloatArray = (options?: { nullable?: boolean }) => {
  return Column({ type: "float", array: true, nullable: options?.nullable });
};

export const Boolean = (options?: { nullable?: boolean }) => {
  return Column({ type: "boolean", nullable: options?.nullable });
};

export const BooleanArray = (options?: { nullable?: boolean }) => {
  return Column({ type: "boolean", array: true, nullable: options?.nullable });
};

export function normalizePayload(value) {
  const warnings = [];
  if (Array.isArray(value)) {
    warnings.push('旧版格式(仅规则数组),已按 v2 规范化');
    return {
      version: 2,
      rules: value.map((r) => ({ ...r, id: r.id ?? r.cfg?.id })),
      variables: {},
      warnings,
    };
  }
  if (typeof value !== 'object' || value === null) {
    throw new Error('备份内容既不是对象也不是数组');
  }
  const rules = [];
  for (const r of value.rules ?? []) {
    if (!r || typeof r !== 'object') {
      warnings.push('存在非对象规则条目,已跳过');
      continue;
    }
    if (!r.id && !r.cfg?.id) {
      warnings.push(`规则缺少 id 与 cfg.id: ${JSON.stringify(r).slice(0, 80)}`);
    }
    rules.push(r);
  }
  return { version: value.version ?? 2, rules, variables: value.variables ?? {}, warnings };
}

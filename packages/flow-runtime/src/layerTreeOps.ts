import type {
  Layer,
  MultipleChoiceLayer,
  SingleChoiceLayer,
  StackLayer,
} from '@getrheo/contracts/layers';

type ChoiceLayer = SingleChoiceLayer | MultipleChoiceLayer;

export const childrenOf = (l: Layer): Layer[] => {
  if (l.kind === 'stack') return l.children;
  if (l.kind === 'carousel') return l.slides;
  if (l.kind === 'button' || l.kind === 'back_button') return l.children;
  if (l.kind === 'hyperlink') return l.children;
  if (l.kind === 'single_choice' || l.kind === 'multiple_choice') return l.children;
  if (l.kind === 'text_input' || l.kind === 'scale_input') return l.children ?? [];
  if (l.kind === 'oauth_login') return l.children;
  if (l.kind === 'oauth_provider' && l.variant === 'custom') return l.children;
  if (l.kind === 'email_password_auth') return l.children;
  if (l.kind === 'email_password_field') return l.children ?? [];
  if (l.kind === 'email_password_submit') return l.children;
  return [];
};

const mintOptionId = (existing: ChoiceLayer['optionBindings'], taken: Set<string>): string => {
  const used = new Set([...existing.map((b) => b.optionId), ...taken]);
  let n = 1;
  while (used.has(`option_${n}`)) n += 1;
  return `option_${n}`;
};

const resyncChoiceBindings = <L extends ChoiceLayer>(layer: L): L => {
  const byRootId = new Map(layer.optionBindings.map((b) => [b.rootLayerId, b]));
  const next: ChoiceLayer['optionBindings'] = [];
  const minted = new Set<string>();
  for (const child of layer.children) {
    const existing = byRootId.get(child.id);
    if (existing) {
      next.push(existing);
    } else {
      const optionId = mintOptionId(next, minted);
      minted.add(optionId);
      next.push({ optionId, rootLayerId: child.id });
    }
  }
  const validIds = new Set(next.map((b) => b.optionId));
  const conditions = layer.branching.conditions.filter((c) => validIds.has(c.choiceId));
  return {
    ...layer,
    optionBindings: next,
    branching: { ...layer.branching, conditions },
  };
};

export const withChoiceSync = <T extends Layer>(layer: T): T => {
  if (layer.kind === 'single_choice' || layer.kind === 'multiple_choice') {
    return resyncChoiceBindings(layer as unknown as ChoiceLayer) as unknown as T;
  }
  return layer;
};

export const findLayerInTree = (root: Layer, id: string): Layer | null => {
  if (root.id === id) return root;
  for (const c of childrenOf(root)) {
    const found = findLayerInTree(c, id);
    if (found) return found;
  }
  return null;
};

export const replaceLayerInTree = <T extends Layer>(
  root: T,
  id: string,
  mutate: (l: Layer) => Layer,
): T => {
  if (root.id === id) return mutate(root) as T;
  if (root.kind === 'stack') {
    return {
      ...root,
      children: root.children.map((c) => replaceLayerInTree(c, id, mutate)),
    } as T;
  }
  if (root.kind === 'carousel') {
    return {
      ...root,
      slides: root.slides.map((s) => replaceLayerInTree(s, id, mutate) as StackLayer),
    } as T;
  }
  if (root.kind === 'button' || root.kind === 'back_button') {
    return {
      ...root,
      children: root.children.map((c) => replaceLayerInTree(c, id, mutate)),
    } as T;
  }
  if (root.kind === 'hyperlink') {
    return {
      ...root,
      children: root.children.map((c) => replaceLayerInTree(c, id, mutate)),
    } as T;
  }
  if (root.kind === 'single_choice' || root.kind === 'multiple_choice') {
    return withChoiceSync({
      ...root,
      children: root.children.map((c) => replaceLayerInTree(c, id, mutate) as StackLayer),
    } as T);
  }
  if (root.kind === 'text_input' || root.kind === 'scale_input') {
    if (!root.children) return root;
    return {
      ...root,
      children: root.children.map((c) => replaceLayerInTree(c, id, mutate)),
    } as T;
  }
  if (root.kind === 'oauth_login') {
    return {
      ...root,
      children: root.children.map((c) => replaceLayerInTree(c, id, mutate)),
    } as T;
  }
  if (root.kind === 'oauth_provider' && root.variant === 'custom') {
    return {
      ...root,
      children: root.children.map((c) => replaceLayerInTree(c, id, mutate)),
    } as T;
  }
  if (root.kind === 'email_password_auth') {
    return {
      ...root,
      children: root.children.map((c) => replaceLayerInTree(c, id, mutate)),
    } as T;
  }
  if (root.kind === 'email_password_field') {
    if (!root.children) return root;
    return {
      ...root,
      children: root.children.map((c) => replaceLayerInTree(c, id, mutate)),
    } as T;
  }
  if (root.kind === 'email_password_submit') {
    return {
      ...root,
      children: root.children.map((c) => replaceLayerInTree(c, id, mutate)),
    } as T;
  }
  return root;
};

export const insertLayerInTree = <T extends Layer>(
  root: T,
  parentId: string,
  layer: Layer,
  index?: number,
): T =>
  replaceLayerInTree(root, parentId, (parent) => {
    if (parent.kind === 'stack') {
      const next = [...parent.children];
      if (index === undefined) next.push(layer);
      else next.splice(index, 0, layer);
      return { ...parent, children: next };
    }
    if (parent.kind === 'carousel' && layer.kind === 'stack') {
      const next = [...parent.slides];
      if (index === undefined) next.push(layer);
      else next.splice(index, 0, layer);
      return { ...parent, slides: next };
    }
    if (parent.kind === 'button' || parent.kind === 'back_button') {
      const next = [...parent.children];
      if (index === undefined) next.push(layer);
      else next.splice(index, 0, layer);
      return { ...parent, children: next };
    }
    if (parent.kind === 'single_choice' || parent.kind === 'multiple_choice') {
      if (layer.kind !== 'stack') return parent;
      const next = [...parent.children];
      if (index === undefined) next.push(layer);
      else next.splice(index, 0, layer);
      return withChoiceSync({ ...parent, children: next });
    }
    if (parent.kind === 'text_input' || parent.kind === 'scale_input') {
      const existing = parent.children ?? [];
      const next = [...existing];
      if (index === undefined) next.push(layer);
      else next.splice(index, 0, layer);
      return { ...parent, children: next };
    }
    return parent;
  });

export const removeLayerFromTree = <T extends Layer>(root: T, id: string): T => {
  if (root.id === id) return root;
  if (root.kind === 'stack') {
    return {
      ...root,
      children: root.children
        .filter((c) => c.id !== id)
        .map((c) => removeLayerFromTree(c, id)),
    } as T;
  }
  if (root.kind === 'carousel') {
    return {
      ...root,
      slides: root.slides
        .filter((s) => s.id !== id)
        .map((s) => removeLayerFromTree(s, id) as StackLayer),
    } as T;
  }
  if (root.kind === 'button' || root.kind === 'back_button') {
    return {
      ...root,
      children: root.children
        .filter((c) => c.id !== id)
        .map((c) => removeLayerFromTree(c, id)),
    } as T;
  }
  if (root.kind === 'single_choice' || root.kind === 'multiple_choice') {
    if (root.children.some((c) => c.id === id) && root.children.length <= 2) return root;
    return withChoiceSync({
      ...root,
      children: root.children
        .filter((c) => c.id !== id)
        .map((c) => removeLayerFromTree(c, id) as StackLayer),
    } as T);
  }
  if (root.kind === 'text_input' || root.kind === 'scale_input') {
    const kids = root.children;
    if (!kids) return root;
    const next = kids.filter((c) => c.id !== id).map((c) => removeLayerFromTree(c, id));
    return { ...root, children: next.length > 0 ? next : undefined } as T;
  }
  return root;
};

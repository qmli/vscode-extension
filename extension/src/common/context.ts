import { createVSCodeContext } from '@orientais/vscode-core/context';
import type { ContextKeys } from '@/common/constants/constants.context';

const ctx = createVSCodeContext<ContextKeys>();

export const onDidChangeContext = ctx.onDidChangeContext;
export const getContext = ctx.getContext;
export const setContext = ctx.setContext;

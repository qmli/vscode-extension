// import type { CancellationToken, Command, TreeItem } from 'vscode';
// import type { TreeViewNodeTypes, TreeViewTypes } from '@shared/webviews/constants/constants.views';
// import type { View } from '../views';

// /*
//  * AmbientContext 是一个接口，用于描述视图节点的环境上下文信息,这些信息可以用来唯一标识节点、控制菜单显示、传递命令参数等。
//  */
// export interface AmbientContext {
//   readonly root?: boolean;
//   readonly searchId?: string;
//   readonly storedComparisonId?: string;
//   readonly viewType?: TreeViewTypes;
// }

// export enum ContextValues {
//   Root = 'root',
//   SearchId = 'searchId',
//   StoredComparisonId = 'storedComparisonId',
//   ViewType = 'viewType'
// }

// export abstract class ViewNode<
// 	Type extends TreeViewNodeTypes = TreeViewNodeTypes,
// 	TView extends View = View,
// 	State extends object = any,
// > implements Disposable
// {
//   is<T extends keyof TreeViewNodeTypes>(type: T): this is TreeViewNodeTypes[T] {
//     return this.type === (type as unknown as Type);
//   }

//   splatted: boolean | undefined;

//   // NOTE: @eamodio uncomment to track node leaks
//   // readonly uuid = uuid();

//   protected _uniqueId!: string;

//   constructor(
//     public readonly type: Type,
//     public readonly view: TView,
//     protected parent?: ViewNode | undefined
//   ) {
//     this.updateContext({ viewType: view.type });

//     // NOTE: @eamodio uncomment to track node leaks
//     // queueMicrotask(() => this.view.registerNode(this));
//     // this._uri = uri;

//     const originalGetChildren = this.getChildren;
//     this.getChildren = function (this: ViewNode) {
//       this.splatted ??= true;
//       return originalGetChildren.call(this);
//     };

//     const originalGetTreeItem = this.getTreeItem;
//     this.getTreeItem = function (this: ViewNode) {
//       this.splatted = false;
//       return originalGetTreeItem.call(this);
//     };
//   }
//   [Symbol.dispose](): void {
//     throw new Error('Method not implemented.');
//   }

//   protected _disposed = false;
//   dispose(): void {
//     this._disposed = true;
//   }

//   get id(): string | undefined {
//     return this._uniqueId;
//   }

//   private _context: AmbientContext | undefined;
//   protected get context(): AmbientContext {
//     return this._context ?? this.parent?.context ?? { viewType: this.view.type };
//   }

//   protected updateContext(context: AmbientContext, reset: boolean = false): void {
//     this._context = this.getNewContext(context, reset);
//   }

//   protected getNewContext(context: AmbientContext, reset: boolean = false): AmbientContext {
//     return { ...(reset ? this.parent?.context : this.context), ...context };
//   }

//   abstract getChildren(): ViewNode[] | Promise<ViewNode[]>;

//   getParent(): ViewNode | undefined {
//     // If this node's parent has been splatted (e.g. not shown itself, but its children are), then return its grandparent
//     return this.parent?.splatted ? this.parent?.getParent() : this.parent;
//   }

//   abstract getTreeItem(): TreeItem | Promise<TreeItem>;

//   resolveTreeItem?(item: TreeItem, token: CancellationToken): TreeItem | Promise<TreeItem>;

//   getCommand(): Command | undefined {
//     return undefined;
//   }

//   refresh?(reset?: boolean): void | { cancel: boolean } | Promise<void | { cancel: boolean }>;

//   triggerChange(reset: boolean = false, force: boolean = false, avoidSelf?: ViewNode): Promise<void> {
//     if (this._disposed) return Promise.resolve();

//     if (this.splatted && this.parent != null && this.parent !== avoidSelf) {
//       return this.parent.triggerChange(reset, force);
//     }

//     return this.view.refreshNode(this, reset, force);
//   }

//   getSplattedChild?(): Promise<ViewNode | undefined>;

//   deleteState<T extends StateKey<State> = StateKey<State>>(key?: T): void {
//     if (this.id == null) {
//       debugger;
//       throw new Error('Id is required to delete state');
//     }
//     this.view.nodeState.deleteState(this.id, key as string);
//   }

//   getState<T extends StateKey<State> = StateKey<State>>(key: T): StateValue<State, T> | undefined {
//     if (this.id == null) {
//       debugger;
//       throw new Error('Id is required to get state');
//     }
//     return this.view.nodeState.getState(this.id, key as string);
//   }

//   storeState<T extends StateKey<State> = StateKey<State>>(key: T, value: StateValue<State, T>, sticky?: boolean): void {
//     if (this.id == null) {
//       debugger;
//       throw new Error('Id is required to store state');
//     }
//     this.view.nodeState.storeState(this.id, key as string, value, sticky);
//   }
// }

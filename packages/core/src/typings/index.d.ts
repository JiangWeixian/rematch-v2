/*
 * Type definitions for rematch-v2
 * Project: Rematch
 * Definitions by:
 * Shawn McKay https://github.com/shmck
 * Bruno Lemos https://github.com/brunolemos
 * Jiangweixian https://github.com/jiangweixian
 */

import * as Redux from 'redux'

export as namespace rematch

export type CombinedModel<
  M extends Models = any,
  extraReducers extends ModelReducers<any> = any,
  extraEffects extends ModelEffects<any> = any
> = {
  name?: string
  state: ExtractRematchStateFromModels<M>
  baseReducer?: (
    state: ExtractRematchStateFromModels<M>,
    action: Action,
  ) => ExtractRematchStateFromModels<M>
  reducers: ExtractRematchDispatchersFromModels<M> &
    {
      [reducerKey in keyof extraReducers]: ExtractRematchDispatcherFromReducer<
        extraReducers[reducerKey]
      >
    }
  effects: ExtractRematchEffectDispatchersFromModels<M> &
    {
      [effectKey in keyof extraEffects]: ExtractRematchDispatcherAsyncFromEffect<
        extraEffects[effectKey]
      >
    }
}

export type ExtractRematchStateFromModels<M extends Models> = {
  [modelKey in keyof M]: M[modelKey]['state']
}

export type RematchRootState<M extends Models> = ExtractRematchStateFromModels<M>

export type ExtractRematchDispatcherAsyncFromEffect<E> = E extends () => Promise<any>
  ? RematchDispatcherAsync<void, void>
  : E extends (payload: infer P) => Promise<any>
  ? RematchDispatcherAsync<P, void>
  : E extends (payload: infer P, meta: any) => Promise<any>
  ? RematchDispatcherAsync<P, void>
  : E extends (payload: infer P, meta: any, extra: any) => Promise<any>
  ? RematchDispatcherAsync<P, void>
  : RematchDispatcherAsync<any, any>

export type ExtractRematchDispatchersFromEffectsObject<effects extends ModelEffects<any>> = {
  [effectKey in keyof effects]: ExtractRematchDispatcherAsyncFromEffect<effects[effectKey]>
}

export type ExtractRematchDispatchersFromEffects<
  effects extends ModelConfig['effects']
> = effects extends ModelEffects<any> ? ExtractRematchDispatchersFromEffectsObject<effects> : {}

export type ExtractRematchDispatcherFromReducer<R> = R extends () => any
  ? RematchDispatcher<void, void>
  : R extends (state: infer S) => infer S
  ? RematchDispatcher<void, void>
  : R extends (state: infer S, payload: infer P) => infer S
  ? RematchDispatcher<P, void>
  : R extends (state: infer S, payload: infer P, meta: infer M) => infer S
  ? RematchDispatcher<P, M>
  : RematchDispatcher<any, any>

export type ExtractRematchDispatchersFromReducersObject<reducers extends ModelReducers<any>> = {
  [reducerKey in keyof reducers]: ExtractRematchDispatcherFromReducer<reducers[reducerKey]>
}

export type ExtractRematchDispatchersFromReducers<
  reducers extends ModelConfig['reducers']
> = ExtractRematchDispatchersFromReducersObject<reducers & {}>

export type ExtractRematchDispatchersFromModel<
  M extends ModelConfig
> = ExtractRematchDispatchersFromReducers<M['reducers']> &
  ExtractRematchDispatchersFromEffects<M['effects']>

export type ExtractRematchDispatchersFromCombinedModel<M extends CombinedModel> = M['reducers'] &
  M['effects']

export type ExtractRematchDispatchersFromModels<M extends Models> = {
  [modelKey in keyof M]: M[modelKey] extends CombinedModel
    ? ExtractRematchDispatchersFromCombinedModel<M[modelKey]>
    : ExtractRematchDispatchersFromModel<M[modelKey]>
}

export type ExtractRematchEffectDispatchersFromModels<M extends Models> = {
  [modelKey in keyof M]: M[modelKey] extends CombinedModel
    ? M[modelKey]['effects']
    : ExtractRematchDispatchersFromEffects<M[modelKey]['effects']>
}

export type RematchDispatcher<P = void, M = void> = ((
  action: Action<P, M>,
) => Redux.Dispatch<Action<P, M>>) &
  ((action: Action<P, void>) => Redux.Dispatch<Action<P, void>>) &
  (P extends void
    ? ((...args: any[]) => Action<any, any>)
    : P extends boolean
    ? ((payload: boolean) => Action<boolean, M>)
    : M extends void
    ? ((payload: P) => Action<P, void>)
    : (payload: P, meta: M) => Action<P, M>)

export type RematchDispatcherAsync<P = void, M = void> = ((
  action: Action<P, M>,
) => Promise<Redux.Dispatch<Action<P, M>>>) &
  ((action: Action<P, void>) => Promise<Redux.Dispatch<Action<P, void>>>) &
  (P extends void
    ? ((...args: any[]) => Promise<Action<any, any>>)
    : P extends boolean
    ? ((payload: boolean) => Promise<Action<boolean, M>>)
    : M extends void
    ? ((payload: P) => Promise<Action<P, void>>)
    : (payload: P, meta: M) => Promise<Action<P, M>>)

export type RematchDispatch<M extends Models | void = void> = (M extends Models
  ? ExtractRematchDispatchersFromModels<M>
  : {
      [key: string]: {
        [key: string]: RematchDispatcher | RematchDispatcherAsync
      }
    }) &
  (RematchDispatcher | RematchDispatcherAsync) &
  (Redux.Dispatch<any>) // for library compatability

export function init<M extends Models>(config: InitConfig<M> | undefined): RematchStore<M>

export function getDispatch<M extends Models>(): RematchDispatch<M>

export type ModelDescriptor<
  S,
  R extends ModelReducers<any>,
  E extends ModelEffects<any>,
  SS = S
> = {
  name?: string
  state: S
  baseReducer?: (state: SS, action: Action) => SS
  reducers?: R
  effects?: E &
    ThisType<
      ExtractRematchDispatchersFromReducers<R> &
        ExtractRematchDispatchersFromEffects<E> & { dispatch: (action: Action) => void }
    >
}

export function createModel<S, R extends ModelReducers<S>, E extends ModelEffects<S>>(
  model: ModelDescriptor<S, R, E>,
): ModelDescriptor<S, R, E>

export function combineModels<
  M extends Models,
  R extends ModelReducers<ExtractRematchStateFromModels<M>>,
  E extends ModelEffects<ExtractRematchStateFromModels<M>>
>({
  name,
  models,
  reducers,
  effects,
  baseReducer,
}: {
  name: string
  models: M
  baseReducer?: ModelConfig<ExtractRematchStateFromModels<M>>['baseReducer']
  reducers?: R
  effects?: E &
    ThisType<
      ExtractRematchDispatchersFromReducers<R> &
        ExtractRematchDispatchersFromEffects<E> &
        ExtractRematchDispatchersFromModels<M> & { dispatch: (action: Action) => void }
    >
}): CombinedModel<M, R, E>

export namespace rematch {
  export function init<M extends Models>(config: InitConfig<M> | undefined): RematchStore<M>
}

export interface RematchStore<M extends Models = Models, A extends Action = Action>
  extends Redux.Store<RematchRootState<M>, A> {
  name: string
  replaceReducer(nextReducer: Redux.Reducer<RematchRootState<M>, A>): void
  dispatch: RematchDispatch<M>
  getState(): RematchRootState<M>
  model(model: Model): void
  subscribe(listener: () => void): Redux.Unsubscribe
}

export type Action<P = any, M = any> = {
  type: string
  payload?: P
  meta?: M
}

export type EnhancedReducer<S, P = object, M = object> = (state: S, payload: P, meta: M) => S

export type EnhancedReducers = {
  [key: string]: EnhancedReducer<any>
}

export type ModelReducers<S = any> = {
  [key: string]: (state: S, payload: any, meta?: any) => S
}

type ModelEffects<S> = {
  [key: string]: (payload: any, rootState: any, currentState: S) => void
}

export type Models = {
  [key: string]: ModelConfig | CombinedModel
}

export type ModelHook = (model: Model) => void

export type Validation = [boolean | undefined, string]

export interface Model<S = any, SS = S> extends ModelConfig<S, SS> {
  name: string
  reducers: ModelReducers<S>
}

export interface ModelConfig<S = any, SS = S> {
  name?: string
  state: S
  baseReducer?: (state: SS, action: Action) => SS
  reducers?: ModelReducers<S>
  effects?: ModelEffects<any>
}

export interface PluginFactory extends Plugin {
  create(plugin: Plugin): Plugin
}

export interface Plugin<M extends Models = Models, A extends Action = Action> {
  config?: InitConfig<M>
  onInit?: () => void
  onStoreCreated?: (store: RematchStore<M, A>) => void
  onModel?: ModelHook
  middleware?: Middleware

  // exposed
  exposed?: {
    [key: string]: any
  }
  validate?(validations: Validation[]): void
  storeDispatch?(action: Action, state: any): Redux.Dispatch<any> | undefined
  storeGetState?(): any
  dispatch?: RematchDispatch<M>
  effects?: Object
  createDispatcher?(modelName: string, reducerName: string): void
}

export interface RootReducers {
  [type: string]: Redux.Reducer<any, Action>
}

export interface DevtoolOptions {
  disabled?: boolean
  [key: string]: any
}

export interface InitConfigRedux<S = any> {
  initialState?: S
  reducers?: ModelReducers
  enhancers?: Redux.StoreEnhancer<any>[]
  middlewares?: Middleware[]
  rootReducers?: RootReducers
  combineReducers?: (reducers: Redux.ReducersMapObject) => Redux.Reducer<any, Action>
  createStore?: Redux.StoreCreator
  devtoolOptions?: DevtoolOptions
}

export interface InitConfig<M extends Models = Models> {
  name?: string
  models?: M
  plugins?: Plugin[]
  redux?: InitConfigRedux
}

export interface Config<M extends Models = Models> extends InitConfig {
  name: string
  models: M
  plugins: Plugin[]
  redux: ConfigRedux
}

export interface Middleware<DispatchExt = {}, S = any, D extends Redux.Dispatch = Redux.Dispatch> {
  (api: Redux.MiddlewareAPI<D, S>): (
    next: Redux.Dispatch<Action>,
  ) => (action: any, state?: any) => any
}

export interface ConfigRedux {
  initialState?: any
  reducers: ModelReducers
  enhancers: Redux.StoreEnhancer<any>[]
  middlewares: Middleware[]
  rootReducers?: RootReducers
  combineReducers?: (reducers: Redux.ReducersMapObject) => Redux.Reducer<any, Action>
  createStore?: Redux.StoreCreator
  devtoolOptions?: DevtoolOptions
}

export interface RematchClass {
  config: Config
  models: Model[]
  addModel(model: Model): void
}

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: any
  }
}

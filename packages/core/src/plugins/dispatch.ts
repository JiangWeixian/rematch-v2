import * as R from '../typings'
import { walk } from '../utils/walk'

/**
 * Dispatch Plugin
 *
 * generates dispatch[modelName][subModelName]...[actionName]
 */
const dispatchPlugin: R.Plugin = {
  exposed: {
    // required as a placeholder for store.dispatch
    storeDispatch(action: R.Action, state: any) {
      console.warn('Warning: store not yet loaded')
    },

    storeGetState() {
      console.warn('Warning: store not yet loaded')
    },

    /**
     * dispatch
     *
     * both a function (dispatch) and an object (dispatch[modelName][actionName])
     * @param action R.Action
     */
    dispatch(action: R.Action) {
      return this.storeDispatch(action)
    },

    /**
     * createActor
     *
     * genereates an action creator for a given model & reducer
     * @param modelName string
     * @param reducerName string
     */
    createActor(modelName: string, reducerName: string) {
      return (payload?: any, meta?: any) => {
        const action: R.Action = { type: `${modelName}/${reducerName}` }
        if (typeof payload !== 'undefined') {
          action.payload = payload
        }
        if (typeof meta !== 'undefined') {
          action.meta = meta
        }
        return action
      }
    },
    // a nested object contain functions, which will create redux(reducers|effects) action object
    actions: {},
    // a plain object contain reducer functions, which will dispatch reducer action
    reducers: {},
  },

  // access store.dispatch after store is created
  onStoreCreated(store: any) {
    this.storeDispatch = store.dispatch
    this.storeGetState = store.getState
    return { dispatch: this.dispatch }
  },

  // generate action creators for all model.reducers
  onModel(model: R.Model) {
    this.dispatch[model.name] = {}
    this.actions[model.name] = {}
    if (!model.reducers) {
      return
    }
    walk({
      modelName: model.name,
      prefix: model.name,
      effectsOrReducers: model.reducers,
      actions: this.actions[model.name],
      dispatch: this.dispatch[model.name],
      onActionCallback: (prefix, key, actions, dispatch, reducer) => {
        actions[key] = this.createActor(prefix, key)
        dispatch[key] = async (payload: any, meta: any) => {
          const action = actions[key](payload, meta)
          this.dispatch(action)
        }
        this.reducers[`${prefix}/${key}`] = dispatch[key]
      },
    })
  },
}

export default dispatchPlugin

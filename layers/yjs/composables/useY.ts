import type { ShallowRef } from 'vue'
import type * as Y from 'yjs'
import { equalityDeep } from 'lib0/function'
import { getCurrentScope, onScopeDispose, shallowRef } from 'vue'

type YTypeToJson<YType>
  = YType extends Y.Array<infer V>
    ? Array<YTypeToJson<V>>
    : YType extends Y.Map<infer MapValue>
      ? { [key: string]: YTypeToJson<MapValue> }
      : YType extends Y.XmlFragment | Y.XmlText | Y.Text
        ? string
        : YType

export function useY<YType extends Y.AbstractType<unknown>>(
  yData: YType,
): Readonly<ShallowRef<YTypeToJson<YType>>> {
  const data = shallowRef<YTypeToJson<YType>>(yData.toJSON())

  const observer = () => {
    const next: YTypeToJson<YType> = yData.toJSON()
    if (!equalityDeep(data.value, next)) {
      data.value = next
    }
  }

  yData.observeDeep(observer)

  if (getCurrentScope()) {
    onScopeDispose(() => yData.unobserveDeep(observer))
  }

  // eslint-disable-next-line ts/consistent-type-assertions
  return data as Readonly<ShallowRef<YTypeToJson<YType>>>
}

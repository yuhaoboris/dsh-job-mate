export const AUTH_UNAVAILABLE = 'AUTH_UNAVAILABLE'
export const AUTH_UNAVAILABLE_MESSAGE = '认证服务未就绪，职伴已停用；检查 Harness／插件版本和 Connection 装配，重启后重试'

export const authAvailable = connection => typeof connection?.requestRejection === 'function'
export const authFailure = () => ({ code: AUTH_UNAVAILABLE, message: AUTH_UNAVAILABLE_MESSAGE })

/** Validate the Host's synchronous contract. Tool probes test availability, not credentials. */
export function checkConnection(connection, headers = {}) {
  try {
    if (!authAvailable(connection)) return { available: false }
    const rejection = connection.requestRejection({ headers })
    if (rejection && typeof rejection.then === 'function') {
      // Attach a handler immediately even though async implementations are unsupported.
      Promise.resolve(rejection).catch(() => {})
      return { available: false }
    }
    if (rejection == null || rejection === false) return { available: true, rejection: null }
    if (Number.isInteger(rejection) && rejection >= 400 && rejection <= 599) {
      return { available: true, rejection }
    }
  } catch { /* A throwing or incompatible guard disables the plugin, not just this route. */ }
  return { available: false }
}

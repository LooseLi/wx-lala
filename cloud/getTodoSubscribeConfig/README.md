# getTodoSubscribeConfig

返回 `requestSubscribeMessage` 所需的 `tmplIds`。在**云开发控制台 → 云函数 → 环境变量**中为该函数配置 `TODO_DIGEST_TEMPLATE_ID`（与 `sendDailyTodoDigest` 使用相同变量名即可）。

未配置时返回空数组，小程序会提示去控制台配置。

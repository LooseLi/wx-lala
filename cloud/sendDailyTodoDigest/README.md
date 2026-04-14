# sendDailyTodoDigest

定时触发：在云开发控制台为本函数配置**定时触发器**（建议每 1 分钟一次），仅在 **Asia/Shanghai 12:30–12:39** 窗口内执行发送逻辑。

模板 ID 与 **`getTodoSubscribeConfig`** 云函数共用同一环境变量 `TODO_DIGEST_TEMPLATE_ID`（小程序端通过该云函数拉取 `tmplIds`，避免把 ID 写进仓库）。

## 环境变量（云函数配置 → 环境变量）

以下变量建议对 **`sendDailyTodoDigest`** 与 **`getTodoSubscribeConfig`** 均配置相同值（控制台可勾选「同一环境变量」或分别复制）。

| 变量名 | 说明 |
|--------|------|
| `TODO_DIGEST_TEMPLATE_ID` | 订阅消息模板 ID（勿写入 Git） |
| `TODO_DIGEST_PHRASE25` | 模板中「任务状态」`phrase25` 的合法取值，须与公众平台该 phrase 字段的可选短语**完全一致**（默认 `待完成`） |
| `TODO_DIGEST_THING17` | 「事项优先级」文案，默认 `今日待办`（`thing` 类型注意字数上限） |
| `MINIPROGRAM_STATE` | 可选：`formal` / `trial` / `developer`，默认 `formal` |

## 数据库

- `user_settings`：`dailyTodoRemindEnabled === true` 的用户才会发送；文档 `_id` 为用户 `openid`。
- `todo_daily_remind`：按 `openid` + `dateStr` 去重，建议控制台为该组合建**唯一索引**。

## 联调（云函数测试参数）

| 参数 | 作用 |
|------|------|
| `skipWindow: true` | 跳过 12:30–12:39 时间窗口（勿用于线上定时器 payload） |
| `dryRun: true` | 不真实调用 `subscribeMessage.send`、不写 `todo_daily_remind`；**必须与** `forceOpenid` 同用 |
| `forceOpenid` | 只处理该用户；非 `dryRun` 时要求 `user_settings` 中已开启提醒 |

示例：`{ "skipWindow": true, "dryRun": true, "forceOpenid": "你的openid" }` 看日志核对模板字段。

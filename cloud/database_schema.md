# 数据库集合结构说明

## checkInRecords 集合
用于存储用户的打卡记录

```json
{
  "userId": "string",        // 用户openid
  "date": "Date",           // 打卡日期
  "timestamp": "Date",      // 具体打卡时间
  "continuousDays": "number", // 连续打卡天数
  "totalCheckIns": "number",  // 总打卡次数
  "rewards": {
    "points": "number",     // 获得的积分
    "badges": ["string"]    // 获得的徽章
  }
}
```

权限设置：
- 读取权限：仅创建者可读
- 写入权限：仅创建者可写
- 更新权限：仅创建者可更新
- 删除权限：仅创建者可删除

## userPoints 集合
用于存储用户的积分信息

```json
{
  "userId": "string",        // 用户openid
  "totalPoints": "number",   // 总积分
  "currentPoints": "number", // 当前可用积分
  "lastUpdateDate": "Date"   // 最后更新时间
}
```

权限设置：
- 读取权限：仅创建者可读
- 写入权限：仅创建者可写
- 更新权限：仅创建者可更新
- 删除权限：仅创建者可删除

## user_settings 集合（待办每日汇总提醒等）

文档 `_id` 建议使用用户 **openid**（与云函数 `todoRemindSettings` 一致）。

```json
{
  "_id": "string",              // openid
  "dailyTodoRemindEnabled": "boolean",
  "updateTime": "Date"
}
```

权限：若**仅通过云函数**读写，可由云函数管理员权限访问；若小程序端直连数据库，需配置「仅创建者可读写」并带 `_openid` 规则。

## todo_daily_remind 集合（每日汇总是否已处理）

用于「每个用户每个自然日只处理一次」（含已发送或当日无待办跳过）。

```json
{
  "openid": "string",
  "dateStr": "string",          // YYYY-MM-DD，与云函数上海时区「今天」一致
  "sent": "boolean",            // true 表示已成功发送订阅消息
  "skipReason": "string",       // 可选，如 no_todos
  "count": "number",           // 可选，发送时的待办条数
  "createdAt": "Date"
}
```

建议在控制台为 **`openid` + `dateStr` 建唯一复合索引**，避免并发重复发送。

## 创建步骤

1. 打开微信开发者工具
2. 切换到云开发控制台
3. 选择"数据库"
4. 点击"添加集合"
5. 分别创建 checkInRecords、userPoints、**user_settings**、**todo_daily_remind** 等集合
6. 为每个集合设置相应的权限

## 索引设置

### checkInRecords 集合索引
1. userId_date 复合索引：
   - 字段：userId(升序), date(降序)
   - 说明：用于快速查询用户某天是否打卡

2. userId_timestamp 复合索引：
   - 字段：userId(升序), timestamp(降序)
   - 说明：用于查询用户最近的打卡记录

### userPoints 集合索引
1. userId 唯一索引：
   - 字段：userId
   - 说明：确保每个用户只有一条积分记录

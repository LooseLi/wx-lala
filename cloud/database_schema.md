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

## 创建步骤

1. 打开微信开发者工具
2. 切换到云开发控制台
3. 选择"数据库"
4. 点击"添加集合"
5. 分别创建 checkInRecords 和 userPoints 集合
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

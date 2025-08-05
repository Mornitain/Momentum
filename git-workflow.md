# 个人Git工作流程

## 1. 日常开发中的快照保存

### 使用Git Stash（临时保存）
```bash
# 保存当前工作状态
git stash push -m "描述当前状态"

# 查看所有stash
git stash list

# 恢复stash
git stash pop  # 恢复并删除
git stash apply stash@{0}  # 恢复但不删除
```

### 使用本地分支（重要节点）
```bash
# 为稳定状态创建分支
git checkout -b stable-$(date +%Y%m%d)

# 回到主开发分支
git checkout pr-22

# 需要时切换到稳定版本
git checkout stable-20250105
```

## 2. 版本管理策略

### 本地提交命名规范
- `WIP: 功能描述` - 工作进度
- `STABLE: 稳定版本描述` - 稳定快照
- `EXPERIMENT: 实验性功能` - 实验代码

### 清理不需要的提交
```bash
# 交互式重基，整理提交历史
git rebase -i HEAD~5

# 软重置到指定提交
git reset --soft HEAD~3
```

## 3. 实用技巧

### 快速保存当前状态
```bash
# 创建别名
git config --global alias.save '!git add -A && git commit -m "SAVE: $(date)"'
git config --global alias.wip '!git add -A && git commit -m "WIP: 工作进度保存"'

# 使用
git save
git wip
```

### 快速恢复
```bash
# 查看最近的SAVE或WIP提交
git log --oneline --grep="SAVE\|WIP" -10

# 回到特定提交
git reset --soft commit_id
```

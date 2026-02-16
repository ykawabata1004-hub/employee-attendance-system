# ===================================
# GitHub デプロイスクリプト
# ===================================
# 使用方法: このスクリプトをPowerShellで実行してください
# 実行前に、YOUR_USERNAMEを自分のGitHubユーザー名に置換してください

# カラー出力用の関数
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Green "========================================="
Write-ColorOutput Green "Employee Attendance System - GitHub Deploy"
Write-ColorOutput Green "========================================="
Write-Output ""

# ステップ1: Gitがインストールされているか確認
Write-ColorOutput Cyan "Step 1: Checking Git installation..."
try {
    $gitVersion = git --version
    Write-ColorOutput Green "✓ Git is installed: $gitVersion"
} catch {
    Write-ColorOutput Red "✗ Git is not installed. Please install Git first:"
    Write-ColorOutput Yellow "  https://git-scm.com/download/win"
    exit 1
}
Write-Output ""

# ステップ2: GitHubユーザー名の入力
Write-ColorOutput Cyan "Step 2: Enter your GitHub username"
$username = Read-Host "GitHub Username"
if ([string]::IsNullOrWhiteSpace($username)) {
    Write-ColorOutput Red "✗ Username cannot be empty"
    exit 1
}
Write-Output ""

# ステップ3: リポジトリ名の入力
Write-ColorOutput Cyan "Step 3: Enter repository name"
Write-Output "(Default: employee-attendance-system)"
$repoName = Read-Host "Repository Name"
if ([string]::IsNullOrWhiteSpace($repoName)) {
    $repoName = "employee-attendance-system"
}
Write-Output ""

# ステップ4: Gitリポジトリの初期化
Write-ColorOutput Cyan "Step 4: Initializing Git repository..."
if (Test-Path ".git") {
    Write-ColorOutput Yellow "! Git repository already exists"
} else {
    git init
    Write-ColorOutput Green "✓ Git repository initialized"
}
Write-Output ""

# ステップ5: ファイルをステージング
Write-ColorOutput Cyan "Step 5: Staging files..."
git add .
Write-ColorOutput Green "✓ Files staged"
Write-Output ""

# ステップ6: コミット
Write-ColorOutput Cyan "Step 6: Creating initial commit..."
git commit -m "Initial commit: Employee Attendance System with English UI and RBAC"
Write-ColorOutput Green "✓ Commit created"
Write-Output ""

# ステップ7: メインブランチに変更
Write-ColorOutput Cyan "Step 7: Renaming branch to 'main'..."
git branch -M main
Write-ColorOutput Green "✓ Branch renamed to 'main'"
Write-Output ""

# ステップ8: リモートリポジトリを追加
Write-ColorOutput Cyan "Step 8: Adding remote repository..."
$remoteUrl = "https://github.com/$username/$repoName.git"
try {
    git remote add origin $remoteUrl
    Write-ColorOutput Green "✓ Remote repository added: $remoteUrl"
} catch {
    Write-ColorOutput Yellow "! Remote 'origin' already exists, updating URL..."
    git remote set-url origin $remoteUrl
    Write-ColorOutput Green "✓ Remote URL updated"
}
Write-Output ""

# ステップ9: プッシュ
Write-ColorOutput Cyan "Step 9: Pushing to GitHub..."
Write-ColorOutput Yellow "Note: You may be prompted to enter your GitHub credentials"
Write-Output ""

try {
    git push -u origin main
    Write-ColorOutput Green "✓ Successfully pushed to GitHub!"
} catch {
    Write-ColorOutput Red "✗ Push failed. Please make sure:"
    Write-ColorOutput Yellow "  1. You have created the repository on GitHub"
    Write-ColorOutput Yellow "  2. You have the correct permissions"
    Write-ColorOutput Yellow "  3. Your GitHub credentials are correct"
    exit 1
}
Write-Output ""

# 完了メッセージ
Write-ColorOutput Green "========================================="
Write-ColorOutput Green "Deployment Complete!"
Write-ColorOutput Green "========================================="
Write-Output ""
Write-ColorOutput Cyan "Next Steps:"
Write-Output ""
Write-Output "1. Go to your GitHub repository:"
Write-ColorOutput Yellow "   https://github.com/$username/$repoName"
Write-Output ""
Write-Output "2. Enable GitHub Pages:"
Write-Output "   - Go to Settings → Pages"
Write-Output "   - Source: Deploy from a branch"
Write-Output "   - Branch: main / (root)"
Write-Output "   - Click Save"
Write-Output ""
Write-Output "3. Your site will be available at:"
Write-ColorOutput Yellow "   https://$username.github.io/$repoName/"
Write-Output ""
Write-ColorOutput Green "For Firebase integration, see deployment_guide.md"
Write-Output ""

# ブラウザでリポジトリを開くか確認
$openBrowser = Read-Host "Open repository in browser? (y/n)"
if ($openBrowser -eq "y" -or $openBrowser -eq "Y") {
    Start-Process "https://github.com/$username/$repoName"
}

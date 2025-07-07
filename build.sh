#!/bin/bash

# MySQL Client 打包脚本
# 使用方法: ./build.sh [platform] [type]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    echo "MySQL Client 打包脚本"
    echo ""
    echo "使用方法:"
    echo "  ./build.sh [platform] [type]"
    echo ""
    echo "平台选项:"
    echo "  mac     - macOS"
    echo "  win     - Windows"
    echo "  linux   - Linux"
    echo "  all     - 所有平台"
    echo ""
    echo "类型选项:"
    echo "  unsigned - 未签名打包 (默认)"
    echo "  signed   - 签名打包 (仅 macOS)"
    echo "  pack     - 仅打包目录"
    echo ""
    echo "示例:"
    echo "  ./build.sh mac unsigned    # macOS 未签名打包"
    echo "  ./build.sh mac signed      # macOS 签名打包"
    echo "  ./build.sh win             # Windows 打包"
    echo "  ./build.sh all             # 所有平台打包"
    echo ""
}

# 检查依赖
check_dependencies() {
    print_info "检查依赖..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm 未安装"
        exit 1
    fi
    
    if [ ! -f "package.json" ]; then
        print_error "package.json 不存在"
        exit 1
    fi
    
    print_success "依赖检查完成"
}

# 安装依赖
install_dependencies() {
    print_info "安装依赖..."
    npm install
    print_success "依赖安装完成"
}

# 清理构建文件
clean_build() {
    print_info "清理构建文件..."
    rm -rf dist/
    print_success "清理完成"
}

# macOS 打包
build_mac() {
    local build_type=$1
    
    print_info "开始 macOS 打包..."
    
    case $build_type in
        "unsigned")
            npm run build:mac-unsigned
            ;;
        "signed")
            if [ -z "$CSC_LINK" ] || [ -z "$CSC_KEY_PASSWORD" ]; then
                print_warning "未设置签名证书，使用未签名打包"
                npm run build:mac-unsigned
            else
                npm run build:mac-signed
            fi
            ;;
        "pack")
            npm run pack:mac
            ;;
        *)
            npm run build:mac-unsigned
            ;;
    esac
    
    print_success "macOS 打包完成"
}

# Windows 打包
build_win() {
    local build_type=$1
    
    print_info "开始 Windows 打包..."
    
    case $build_type in
        "unsigned"|"signed")
            npm run build:win-unsigned
            ;;
        "pack")
            npm run pack:win
            ;;
        *)
            npm run build:win-unsigned
            ;;
    esac
    
    print_success "Windows 打包完成"
}

# Linux 打包
build_linux() {
    local build_type=$1
    
    print_info "开始 Linux 打包..."
    
    case $build_type in
        "unsigned"|"signed")
            npm run build:linux-unsigned
            ;;
        "pack")
            npm run pack:linux
            ;;
        *)
            npm run build:linux-unsigned
            ;;
    esac
    
    print_success "Linux 打包完成"
}

# 显示打包结果
show_results() {
    print_info "打包结果:"
    
    if [ -d "dist" ]; then
        echo ""
        find dist -type f -name "*.dmg" -o -name "*.exe" -o -name "*.AppImage" -o -name "*.deb" -o -name "*.zip" | while read file; do
            size=$(du -h "$file" | cut -f1)
            echo "  $(basename "$file") ($size)"
        done
        echo ""
    else
        print_warning "未找到打包文件"
    fi
}

# 主函数
main() {
    local platform=${1:-"mac"}
    local build_type=${2:-"unsigned"}
    
    # 显示帮助
    if [ "$platform" = "help" ] || [ "$platform" = "-h" ] || [ "$platform" = "--help" ]; then
        show_help
        exit 0
    fi
    
    print_info "开始打包 MySQL Client..."
    print_info "平台: $platform"
    print_info "类型: $build_type"
    echo ""
    
    # 检查依赖
    check_dependencies
    
    # 安装依赖
    install_dependencies
    
    # 清理构建文件
    clean_build
    
    # 根据平台打包
    case $platform in
        "mac")
            build_mac "$build_type"
            ;;
        "win")
            build_win "$build_type"
            ;;
        "linux")
            build_linux "$build_type"
            ;;
        "all")
            build_mac "$build_type"
            build_win "$build_type"
            build_linux "$build_type"
            ;;
        *)
            print_error "不支持的平台: $platform"
            show_help
            exit 1
            ;;
    esac
    
    # 显示结果
    show_results
    
    print_success "打包完成！"
}

# 运行主函数
main "$@" 
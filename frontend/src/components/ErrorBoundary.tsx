import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

type FallbackProps = {
  onReset: () => void;
  onReload: () => void;
};

const FallbackUI = ({ onReset, onReload }: FallbackProps) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    onReset();
    navigate('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center">
      <h1 className="text-2xl font-bold text-gray-900">
        予期しないエラーが発生しました
      </h1>
      <p className="text-gray-600">
        ページを再読み込みして、もう一度お試しください。
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onReload}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition text-sm"
        >
          ページを再読み込み
        </button>
        <button
          type="button"
          onClick={handleGoHome}
          className="text-blue-600 hover:text-blue-800 font-medium text-sm underline transition"
        >
          タイムラインへ戻る
        </button>
      </div>
    </div>
  );
};

type Props = {
  children: ReactNode;
  onReload?: () => void;
};

type State = {
  hasError: boolean;
};

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unhandled React render error', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  handleReload = () => {
    const reload = this.props.onReload ?? (() => window.location.reload());
    reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <FallbackUI
          onReset={this.handleReset}
          onReload={this.handleReload}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

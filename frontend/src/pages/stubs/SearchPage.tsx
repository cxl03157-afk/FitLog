import { useEffect, useState } from 'react';
import axios from 'axios';
import NavBar from '../../components/NavBar';
import UserCard from '../../components/UserCard';
import { searchUsers } from '../../api/users';
import type { SearchUser } from '../../types/user';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const timer = setTimeout(() => {
      setSearching(true);
      searchUsers(trimmed, undefined, controller.signal)
        .then((data) => {
          if (cancelled) return;
          setResults(data);
          setSearchError(null);
          setHasSearched(true);
        })
        .catch((err) => {
          if (cancelled) return;
          if (!axios.isCancel(err)) {
            setSearchError('検索に失敗しました。');
            setResults([]);
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);

    return () => {
      clearTimeout(timer);
      cancelled = true;
      controller.abort();
      setResults([]);
      setSearchError(null);
      setSearching(false);
      setHasSearched(false);
    };
  }, [query]);

  const trimmed = query.trim();

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ユーザー名で検索"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="search-input"
          />
        </div>

        {trimmed.length > 0 && trimmed.length < 2 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            2文字以上で検索してください。
          </div>
        )}

        {searching && (
          <div className="text-center py-8 text-gray-400">検索中...</div>
        )}

        {searchError && !searching && (
          <div className="text-center py-8 text-red-500">{searchError}</div>
        )}

        {!searching && !searchError && hasSearched && results.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            一致するユーザーが見つかりません。
          </div>
        )}

        {!searching && !searchError && results.length > 0 && (
          <div className="flex flex-col gap-3">
            {results.map((u) => (
              <UserCard key={u.id} user={u} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;

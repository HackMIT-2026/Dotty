import { Navigate, Route, Routes } from 'react-router-dom';

import { ChildHomeScreen } from './screens/ChildHomeScreen';
import { ParentFeedScreen } from './screens/ParentFeedScreen';
import { PetPreviewScreen } from './screens/PetPreviewScreen';

/** /child, /parent, and / redirects to /child. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/child" replace />} />
      <Route path="/child" element={<ChildHomeScreen />} />
      <Route path="/parent" element={<ParentFeedScreen />} />
      <Route path="/pet-preview" element={<PetPreviewScreen />} />
      <Route path="*" element={<Navigate to="/child" replace />} />
    </Routes>
  );
}

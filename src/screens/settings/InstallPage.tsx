import { InstallSteps } from '../../components/InstallSteps.tsx';

/** Settings > Help > How to install: the banner's content, always reachable (DESIGN 5.11). */
export function InstallPage() {
  return (
    <div className="form" data-testid="install-page">
      <InstallSteps />
    </div>
  );
}

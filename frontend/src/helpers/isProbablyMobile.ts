type NavigatorWithUAData = Navigator & {
  userAgentData?: {
    mobile?: boolean;
  };
};

function isProbablyMobileBrowser(): boolean {
  const nav = navigator as NavigatorWithUAData;

  if (nav.userAgentData?.mobile != null) {
    return nav.userAgentData.mobile;
  }

  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export { isProbablyMobileBrowser };

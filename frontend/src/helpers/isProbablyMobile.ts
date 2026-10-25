type NavigatorWithUAData = Navigator & {
  userAgentData?: {
    mobile?: boolean;
  };
};

function testIsProbablyMobileBrowser(): boolean {
  const nav = navigator as NavigatorWithUAData;

  if (nav.userAgentData?.mobile !== null) {
    return nav.userAgentData?.mobile === true;
  }

  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

const isProbablyMobileBrowser = testIsProbablyMobileBrowser();

export { isProbablyMobileBrowser };

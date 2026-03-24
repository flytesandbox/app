import 'server-only'

export type ReleaseMetadata = {
  appEnv: string
  imageName: string
  releaseGitSha: string
  releaseImageTag: string
  releaseDeployedAt: string
  releasePreviousGoodTag: string
}

function readReleaseValue(
  name: string,
  fallback = 'unknown',
  maxLength = 191,
): string {
  const rawValue = process.env[name]

  if (typeof rawValue !== 'string') {
    return fallback
  }

  const trimmed = rawValue.trim()
  return trimmed ? trimmed.slice(0, maxLength) : fallback
}

export function getReleaseMetadata(): ReleaseMetadata {
  return {
    appEnv: readReleaseValue('APP_ENV'),
    imageName: readReleaseValue('IMAGE_NAME'),
    releaseGitSha: readReleaseValue('RELEASE_GIT_SHA'),
    releaseImageTag: readReleaseValue('RELEASE_IMAGE_TAG'),
    releaseDeployedAt: readReleaseValue('RELEASE_DEPLOYED_AT'),
    releasePreviousGoodTag: readReleaseValue('RELEASE_PREVIOUS_GOOD_TAG'),
  }
}

export function getReleaseLogFields() {
  const release = getReleaseMetadata()

  return {
    service: 'web',
    appEnv: release.appEnv,
    imageName: release.imageName,
    releaseGitSha: release.releaseGitSha,
    releaseImageTag: release.releaseImageTag,
    releaseDeployedAt: release.releaseDeployedAt,
    releasePreviousGoodTag: release.releasePreviousGoodTag,
  }
}

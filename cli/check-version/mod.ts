export const checkVersion = async (version: string) => {
	// fetch latest tag from github
	const latestTagRes = await fetch(
		'https://api.github.com/repos/RoboVault/robo-arkiver/releases/latest',
	)

	if (!latestTagRes.ok) {
		return
	}

	const latestTag = await latestTagRes.json()

	if (latestTag.tag_name !== version) {
		console.log(
			'\n%c🆙 New version available! Run `arkiver upgrade` to upgrade\n',
			'color: #3ef06e; font-weight: bold;',
		)
	}
}

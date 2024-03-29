const { ConflictError } = require("@errors/ConflictError")

describe("Base Directory Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const collectionName = "collection"
  const directoryName = `_${collectionName}`
  const subcollectionName = `subcollection`
  const sha = "12345"
  const message = "message"
  const currentCommitSha = "98765"
  const treeSha = "00000"

  const mockedTree = [
    {
      type: "tree",
      path: "_normal",
    },
    {
      type: "tree",
      path: `${directoryName}`,
    },
    {
      type: "tree",
      path: `${directoryName}/${subcollectionName}`,
    },
    {
      type: "tree",
      path: `_to-keep/${directoryName}/${subcollectionName}`,
    },
    {
      type: "file",
      path: "_normal/file.md",
    },
    {
      type: "file",
      path: `${directoryName}/file.md`,
    },
    {
      type: "file",
      path: `${directoryName}/${subcollectionName}/file.md`,
    },
    {
      type: "file",
      path: `${directoryName}/${subcollectionName}/file2.md`,
    },
    {
      type: "file",
      path: `${directoryName}/${subcollectionName}/file3.md`,
    },
    {
      type: "file",
      path: `_to-keep/${directoryName}/${subcollectionName}/file.md`,
    },
  ]

  const reqDetails = { siteName, accessToken, currentCommitSha, treeSha }

  const mockGithubService = {
    readDirectory: jest.fn(),
    getTree: jest.fn(),
    updateTree: jest.fn(),
    updateRepoState: jest.fn(),
  }

  const {
    BaseDirectoryService,
  } = require("@services/directoryServices/BaseDirectoryService")
  const service = new BaseDirectoryService({
    gitHubService: mockGithubService,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("List", () => {
    const readDirResp = [
      {
        name: "test-name",
        path: "test-path",
        sha,
        size: 10,
        type: "file",
      },
      {
        name: "test-name2",
        path: "test-path2",
        sha: "test-sha",
        size: 10,
        type: "file",
      },
    ]
    const githubServiceResp = readDirResp.map((item) => ({
      ...item,
      extra: "extra",
    }))
    mockGithubService.readDirectory.mockResolvedValueOnce(githubServiceResp)
    it("Listing directory contents filters and returns only relevant data", async () => {
      await expect(
        service.list(reqDetails, {
          directoryName,
        })
      ).resolves.toMatchObject(readDirResp)
      expect(mockGithubService.readDirectory).toHaveBeenCalledWith(reqDetails, {
        directoryName,
      })
    })
  })

  describe("Rename", () => {
    const renamedDir = "_renamed-dir"
    const mockedRenamedTree = [
      {
        type: "tree",
        path: `${renamedDir}`,
      },
      {
        type: "file",
        path: `${directoryName}/file.md`,
        sha: null,
      },
      {
        type: "file",
        path: `${directoryName}/${subcollectionName}/file.md`,
        sha: null,
      },
      {
        type: "file",
        path: `${directoryName}/${subcollectionName}/file2.md`,
        sha: null,
      },
      {
        type: "file",
        path: `${directoryName}/${subcollectionName}/file3.md`,
        sha: null,
      },
    ]
    mockGithubService.getTree.mockResolvedValueOnce([
      ...mockedTree,
      {
        type: "tree",
        path: renamedDir,
      },
    ])
    it("Renaming a directory to one with an existing name throws an error", async () => {
      await expect(
        service.rename(reqDetails, {
          oldDirectoryName: directoryName,
          newDirectoryName: renamedDir,
          message,
        })
      ).rejects.toThrowError(ConflictError)
      expect(mockGithubService.getTree).toHaveBeenCalledWith(reqDetails, {
        isRecursive: true,
      })
    })
    mockGithubService.getTree.mockResolvedValueOnce(mockedTree)
    mockGithubService.updateTree.mockResolvedValueOnce(sha)
    it("Renaming directories works correctly", async () => {
      await expect(
        service.rename(reqDetails, {
          oldDirectoryName: directoryName,
          newDirectoryName: renamedDir,
          message,
        })
      ).resolves.not.toThrow()
      expect(mockGithubService.getTree).toHaveBeenCalledWith(reqDetails, {
        isRecursive: true,
      })
      expect(mockGithubService.updateTree).toHaveBeenCalledWith(reqDetails, {
        gitTree: mockedRenamedTree,
        message,
      })
      expect(mockGithubService.updateRepoState).toHaveBeenCalledWith(
        reqDetails,
        {
          commitSha: sha,
        }
      )
    })
  })

  describe("Delete", () => {
    const mockedDeletedTree = [
      {
        type: "file",
        path: `${directoryName}/file.md`,
        sha: null,
      },
      {
        type: "file",
        path: `${directoryName}/${subcollectionName}/file.md`,
        sha: null,
      },
      {
        type: "file",
        path: `${directoryName}/${subcollectionName}/file2.md`,
        sha: null,
      },
      {
        type: "file",
        path: `${directoryName}/${subcollectionName}/file3.md`,
        sha: null,
      },
    ]
    mockGithubService.getTree.mockResolvedValueOnce(mockedTree)
    mockGithubService.updateTree.mockResolvedValueOnce(sha)
    it("Deleting directories works correctly", async () => {
      await expect(
        service.delete(reqDetails, {
          directoryName,
          message,
        })
      ).resolves.not.toThrow()
      expect(mockGithubService.getTree).toHaveBeenCalledWith(reqDetails, {
        isRecursive: true,
      })
      expect(mockGithubService.updateTree).toHaveBeenCalledWith(reqDetails, {
        gitTree: mockedDeletedTree,
        message,
      })
      expect(mockGithubService.updateRepoState).toHaveBeenCalledWith(
        reqDetails,
        {
          commitSha: sha,
        }
      )
    })
  })

  describe("Move Files", () => {
    const targetDir = "_target-dir"
    const mockedMovedTree = [
      {
        type: "file",
        path: `${targetDir}/file.md`,
      },
      {
        type: "file",
        path: `${directoryName}/${subcollectionName}/file.md`,
        sha: null,
      },
      {
        type: "file",
        path: `${targetDir}/file2.md`,
      },
      {
        type: "file",
        path: `${directoryName}/${subcollectionName}/file2.md`,
        sha: null,
      },
    ]
    mockGithubService.getTree.mockResolvedValueOnce([
      ...mockedTree,
      {
        type: "file",
        path: `${targetDir}/file.md`,
      },
    ])
    it("Moving files to a directory which has a file of the same name throws an error", async () => {
      await expect(
        service.moveFiles(reqDetails, {
          oldDirectoryName: `${directoryName}/${subcollectionName}`,
          newDirectoryName: targetDir,
          targetFiles: ["file.md", "file2.md"],
          message,
        })
      ).rejects.toThrowError(ConflictError)
      expect(mockGithubService.getTree).toHaveBeenCalledWith(reqDetails, {
        isRecursive: true,
      })
    })
    mockGithubService.getTree.mockResolvedValueOnce(mockedTree)
    mockGithubService.updateTree.mockResolvedValueOnce(sha)
    it("Moving files in directories works correctly", async () => {
      await expect(
        service.moveFiles(reqDetails, {
          oldDirectoryName: `${directoryName}/${subcollectionName}`,
          newDirectoryName: targetDir,
          targetFiles: ["file.md", "file2.md"],
          message,
        })
      ).resolves.not.toThrow()
      expect(mockGithubService.getTree).toHaveBeenCalledWith(reqDetails, {
        isRecursive: true,
      })
      expect(mockGithubService.updateTree).toHaveBeenCalledWith(reqDetails, {
        gitTree: mockedMovedTree,
        message,
      })
      expect(mockGithubService.updateRepoState).toHaveBeenCalledWith(
        reqDetails,
        {
          commitSha: sha,
        }
      )
    })
  })
})

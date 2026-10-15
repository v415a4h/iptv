package com.iptvmate.app.ui.home

import android.content.Intent
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.media3.ui.PlayerView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.iptvmate.app.player.IptvPlayerManager
import com.iptvmate.app.ui.settings.SettingsActivity
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class LiveTvActivity : AppCompatActivity() {

    private val viewModel: LiveTvViewModel by viewModels()
    private lateinit var playerManager: IptvPlayerManager
    private lateinit var playerView: PlayerView
    private lateinit var channelRecyclerView: RecyclerView
    private lateinit var sidebarContainer: View
    private lateinit var liveTvSidebarItem: View
    private lateinit var settingsSidebarItem: View

    private var isSidebarVisible = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        playerManager = IptvPlayerManager(this)

        initViews()
        observeViewModel()
    }

    private fun initViews() {
        // TV Navigation: default focus starts directly on channel list
        channelRecyclerView.layoutManager = LinearLayoutManager(this)
        channelRecyclerView.requestFocus()

        liveTvSidebarItem.setOnClickListener {
            hideSidebar()
            channelRecyclerView.requestFocus()
        }

        settingsSidebarItem.setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }
    }

    private fun observeViewModel() {
        lifecycleScope.launch {
            viewModel.currentPlayingChannel.collectLatest { channel ->
                channel?.let { playerManager.switchChannel(it) }
            }
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                // Instantly play focused channel
                viewModel.playFocusedChannel()
                return true
            }
            KeyEvent.KEYCODE_DPAD_LEFT -> {
                if (!isSidebarVisible) {
                    showSidebar()
                    return true
                }
            }
            KeyEvent.KEYCODE_DPAD_RIGHT -> {
                if (isSidebarVisible) {
                    hideSidebar()
                    channelRecyclerView.requestFocus()
                    return true
                }
            }
            KeyEvent.KEYCODE_BACK -> {
                if (isSidebarVisible) {
                    hideSidebar()
                    channelRecyclerView.requestFocus()
                    return true
                }
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    private fun showSidebar() {
        isSidebarVisible = true
        sidebarContainer.visibility = View.VISIBLE
        liveTvSidebarItem.requestFocus()
    }

    private fun hideSidebar() {
        isSidebarVisible = false
        sidebarContainer.visibility = View.GONE
    }

    override fun onDestroy() {
        super.onDestroy()
        playerManager.release()
    }
}
